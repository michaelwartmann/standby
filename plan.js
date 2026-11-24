"use strict";
// Standby – the chain engine. Design case: the whole country without power for 28 days in winter,
// nothing coming in from outside. Each need is a chain; the engine finds the level a household reaches
// (0 = not even survival, 1 = survive without any electricity, 2 = okay, 3 = comfortable)
// and the missing links that block the next level. Facts and numbers: see the study (README).

const GOAL = 28;
const yes = { v: "yes", en: "Yes", de: "Ja" }, no = { v: "no", en: "No", de: "Nein" }, yn = [yes, no];
const NONE = { v: "none", en: "None of these", de: "Nichts davon", only1: true };
const TICK = { en: "Tick everything that applies.", de: "Alles ankreuzen, was zutrifft." };
// Multi-choice answers are arrays. Older saved answers were single strings: normalise them.
const arr = v => Array.isArray(v) ? v : (v === undefined || v === "" ? [] : [v]);
const has = (a, k, ...vs) => arr(a[k]).some(x => vs.includes(x));
const OLD = { safety: { both: ["co", "blanket"], one: ["blanket"], none: ["none"] }, aid: { both: ["kit", "course"], kit: ["kit"], none: ["none"] } };
function normalize(a) {
  for (const q of Q) if (q.type === "multi" && a[q.id] !== undefined && !Array.isArray(a[q.id])) a[q.id] = (OLD[q.id] && OLD[q.id][a[q.id]]) || arr(a[q.id]);
  return a;
}

/* ---------- questions (ids are stable: answers are stored under them) ---------- */
const Q = [
  // the castle itself
  { id: "adults", type: "num", def: 1, min: 1, en: "Adults (14 and over)", de: "Erwachsene (ab 14)" },
  { id: "kids", type: "num", def: 0, min: 0, en: "Children (under 14)", de: "Kinder (unter 14)" },
  { id: "frail", type: "num", def: 0, min: 0, en: "Of these: people who are old, ill or need care", de: "Davon: alte, kranke oder pflegebedürftige Menschen" },
  { id: "home", type: "choice", en: "Your home", de: "Dein Zuhause",
    opts: [{ v: "house", en: "A house", de: "Ein Haus" }, { v: "flat", en: "A flat", de: "Eine Wohnung" }] },
  { id: "floor", type: "choice", en: "Which floor do you live on?", de: "In welchem Stock wohnst du?",
    hint: { en: "Without power, the building's water pumps and the lift stop. In Berlin 2026, water needed bucket chains from about the 6th floor.", de: "Ohne Strom stehen Pumpen und Aufzug. In Berlin 2026 brauchte es ab etwa dem 6. Stock Eimerketten fürs Wasser." },
    opts: [{ v: "low", en: "Ground floor to 3rd", de: "Erdgeschoss bis 3. Stock" }, { v: "mid", en: "4th to 6th", de: "4. bis 6. Stock" }, { v: "high", en: "7th or higher", de: "7. Stock oder höher" }] },
  { id: "tenure", type: "choice", en: "Do you own or rent?", de: "Eigentum oder Miete?",
    opts: [{ v: "own", en: "Own", de: "Eigentum" }, { v: "rent", en: "Rent", de: "Miete" }] },
  { id: "area", type: "choice", en: "Where is it?", de: "Wo liegt es?",
    opts: [{ v: "city", en: "Big city", de: "Großstadt" }, { v: "town", en: "Small town", de: "Kleinstadt" }, { v: "country", en: "Village or countryside", de: "Dorf oder Land" }] },
  { id: "climate", type: "choice", def: "seasonal", en: "Your climate", de: "Dein Klima",
    opts: [{ v: "seasonal", en: "Seasons: cold winters, warm summers (like Central Europe)", de: "Jahreszeiten: kalte Winter, warme Sommer (wie Mitteleuropa)" },
           { v: "cold", en: "Long hard frost, often below −15 °C", de: "Langer harter Frost, oft unter −15 °C" },
           { v: "hot", en: "Extreme heat, often above 40 °C", de: "Extreme Hitze, oft über 40 °C" }] },
  // hearth: warmth
  { id: "heating", type: "multi", en: "How can your home be heated? Tick every heat source you have.", de: "Womit kann dein Zuhause geheizt werden? Kreuze jede Wärmequelle an, die du hast.",
    hint: { en: "Almost every heating system needs electricity for pumps, ignition and controls. A stove or fireplace next to the boiler counts too.", de: "Fast jede Heizung braucht Strom für Pumpe, Zündung und Steuerung. Ein Ofen oder Kamin neben der Heizung zählt auch." },
    opts: [{ v: "gas_own", en: "Own gas boiler (in the house or flat)", de: "Eigene Gastherme (im Haus oder in der Wohnung)" },
           { v: "oil", en: "Oil boiler", de: "Ölheizung" },
           { v: "central", en: "Central heating of the building, or district heating", de: "Zentralheizung des Gebäudes oder Fernwärme" },
           { v: "heatpump", en: "Heat pump", de: "Wärmepumpe" },
           { v: "electric", en: "Electric heaters", de: "Elektroheizung" },
           { v: "wood", en: "Wood or tiled stove that runs without power", de: "Holz- oder Kachelofen, der ohne Strom läuft" }] },
  { id: "wood", type: "choice", en: "Dry wood for 4 weeks of heating?", de: "Trockenes Holz für 4 Wochen Heizen?", only: a => has(a, "heating", "wood"), opts: yn },
  { id: "warmroom", type: "choice", en: "Do you know which room will be your warm room?", de: "Weißt du, welcher Raum euer warmer Raum wird?",
    hint: { en: "The smallest room with the fewest outside walls. Everyone sleeps there; the window gets covered.", de: "Der kleinste Raum mit den wenigsten Außenwänden. Alle schlafen dort; das Fenster wird abgedeckt." }, opts: yn },
  { id: "sleep", type: "choice", en: "A warm sleeping bag (comfort about 0 °C) for everyone?", de: "Ein warmer Schlafsack (Komfort etwa 0 °C) für alle?",
    opts: [{ v: "all", en: "Yes, for everyone", de: "Ja, für alle" }, { v: "some", en: "For some", de: "Für manche" }, { v: "none", en: "No", de: "Nein" }] },
  { id: "tent", type: "choice", en: "A tent you can put up inside the warm room?", de: "Ein Zelt, das ihr im warmen Raum aufstellen könnt?",
    hint: { en: "A tent in a cold room, with a blanket over it, is about 5–8 °C warmer inside.", de: "Ein Zelt im kalten Raum, mit einer Decke darüber, ist innen etwa 5–8 °C wärmer." }, opts: yn },
  { id: "blankets", type: "choice", en: "Extra blankets and hot-water bottles?", de: "Zusätzliche Decken und Wärmflaschen?", opts: yn },
  // workshop: power links
  { id: "power", type: "choice", en: "A power station (battery with sockets)?", de: "Eine Powerstation (Akku mit Steckdosen)?",
    opts: [{ v: "none", en: "No", de: "Nein" }, { v: "small", en: "Small, under 500 Wh", de: "Klein, unter 500 Wh" }, { v: "mid", en: "500 to 1,500 Wh", de: "500 bis 1.500 Wh" }, { v: "big", en: "More than 1,500 Wh", de: "Mehr als 1.500 Wh" }] },
  { id: "sine", type: "choice", en: "Does it give 230 V with a pure sine wave?", de: "Liefert sie 230 V mit reinem Sinus?",
    hint: { en: "Heating electronics need a pure sine wave. It says so on the data sheet.", de: "Heizungselektronik braucht reinen Sinus. Das steht im Datenblatt." },
    only: a => a.power && a.power !== "none", opts: [yes, no, { v: "unknown", en: "Don't know", de: "Weiß nicht" }] },
  { id: "plug", type: "choice", en: "Can your boiler be plugged into a power station?", de: "Lässt sich deine Heizung an eine Powerstation anstecken?",
    hint: { en: "Most boilers are hard-wired. An electrician fits a plug or a changeover switch once. Never feed power into the house wiring yourself.", de: "Die meisten Heizungen sind fest verdrahtet. Eine Elektrofachkraft setzt einmal einen Stecker oder Umschalter. Nie selbst Strom ins Hausnetz einspeisen." },
    only: a => has(a, "heating", "gas_own", "oil"), opts: [{ v: "yes", en: "Yes, it has a plug", de: "Ja, sie hat einen Stecker" }, { v: "no", en: "No, hard-wired", de: "Nein, fest verdrahtet" }, { v: "unknown", en: "Don't know", de: "Weiß nicht" }] },
  { id: "car", type: "multi", en: "Cars in the household (tick all)", de: "Autos im Haushalt (alle ankreuzen)",
    opts: [{ v: "none", en: "No car", de: "Kein Auto", only1: true }, { v: "ice", en: "Petrol or diesel", de: "Benzin oder Diesel" }, { v: "ev", en: "Electric, without a 230 V socket", de: "Elektro, ohne 230-V-Steckdose" }, { v: "v2l", en: "Electric with a 230 V socket (V2L) or feeding the house (V2H)", de: "Elektro mit 230-V-Steckdose (V2L) oder Hauseinspeisung (V2H)" }] },
  { id: "solar", type: "choice", en: "A solar panel you can plug straight into the power station?", de: "Ein Solarpanel, das direkt an die Powerstation passt?",
    hint: { en: "A normal plug-in solar system (Balkonkraftwerk) switches off when the grid is down. It only helps through a power station.", de: "Ein normales Balkonkraftwerk schaltet sich bei Netzausfall ab. Es hilft nur über eine Powerstation." }, opts: yn },
  { id: "generator", type: "choice", en: "A generator (used outdoors only)?", de: "Ein Stromerzeuger (nur draußen betrieben)?", opts: yn },
  { id: "tools", type: "choice", en: "Basic tools, and you know where the main water valve and fuse box are?", de: "Grundwerkzeug, und du weißt, wo Hauptwasserhahn und Sicherungskasten sind?", opts: yn },
  // lantern: light and phone power
  { id: "light", type: "choice", en: "A headlamp or torch for everyone, with spare batteries?", de: "Stirn- oder Taschenlampe für alle, mit Ersatzbatterien?", opts: yn },
  { id: "banks", type: "choice", en: "Charged power banks for the phones?", de: "Geladene Powerbanks für die Handys?", opts: yn },
  // signal tower: information
  { id: "radio", type: "choice", en: "A crank, battery or solar radio?", de: "Ein Kurbel-, Batterie- oder Solarradio?", opts: yn },
  { id: "famplan", type: "choice", en: "Without phones, do you know how to reach family, friends, and someone in the fire brigade or Red Cross nearby?", de: "Weißt du, wie du ohne Handy Familie, Freunde und jemanden von Feuerwehr oder Rotem Kreuz in der Nähe erreichst?", hint: { en: "Within walking distance: their house is enough. Farther away: agree a place and times.", de: "Zu Fuß erreichbar: ihr Zuhause reicht. Weiter weg: Ort und Uhrzeiten absprechen." }, opts: yn },
  { id: "meet", type: "choice", en: "Do you know your town's emergency point (Kat-Leuchtturm)?", de: "Kennst du den Notfall-Treffpunkt (Kat-Leuchtturm) deiner Gemeinde?", opts: yn },
  // well: water and toilet
  { id: "water_l", type: "num", def: 0, min: 0, en: "Drinking water stored at home (litres, all together)", de: "Trinkwasser zu Hause (Liter, alles zusammen)",
    hint: { en: "2 litres per person per day. Tap water in clean food-grade canisters works; renew it about every 6 months.", de: "2 Liter pro Person und Tag. Leitungswasser in sauberen, lebensmittelechten Kanistern geht; etwa alle 6 Monate erneuern." } },
  { id: "treat", type: "multi", en: "How can you make water safe to drink?", de: "Wie kannst du Wasser trinkbar machen?", hint: TICK,
    opts: [{ v: "filter", en: "Water filter", de: "Wasserfilter" }, { v: "tabs", en: "Disinfection tablets", de: "Entkeimungstabletten" }, { v: "boil", en: "Boiling", de: "Abkochen" }, NONE] },
  { id: "canisters", type: "choice", en: "Empty canisters to fetch water from an emergency well?", de: "Leere Kanister, um Wasser vom Notbrunnen zu holen?", opts: yn },
  { id: "toilet", type: "choice", en: "Emergency toilet ready (bucket, strong bags, cat litter or sawdust)?", de: "Nottoilette bereit (Eimer, feste Beutel, Katzenstreu oder Sägespäne)?", opts: yn },
  { id: "hygiene", type: "choice", en: "Soap, wet wipes and disinfectant for 4 weeks?", de: "Seife, Feuchttücher und Desinfektion für 4 Wochen?", opts: yn },
  // kitchen: food
  { id: "food", type: "choice", en: "Food that keeps without a fridge lasts your household…", de: "Essen, das ohne Kühlschrank hält, reicht deinem Haushalt…",
    hint: { en: "Count at normal eating. The design case is no shop open for 28 days.", de: "Bei normalem Essen gerechnet. Der Ernstfall: 28 Tage kein Laden offen." },
    opts: [{ v: "3", en: "up to 3 days", de: "bis 3 Tage" }, { v: "10", en: "about 10 days", de: "etwa 10 Tage" }, { v: "20", en: "about 3 weeks", de: "etwa 3 Wochen" }, { v: "28", en: "4 weeks or more", de: "4 Wochen oder mehr" }] },
  { id: "cook", type: "multi", en: "How can you cook without electricity?", de: "Wie kannst du ohne Strom kochen?", hint: TICK,
    opts: [{ v: "gas", en: "Gas hob (mains gas)", de: "Gasherd (Gasleitung)" }, { v: "camping", en: "Camping stove with fuel for 4 weeks", de: "Campingkocher mit Brennstoff für 4 Wochen" }, { v: "wood", en: "Rocket stove, wood stove or fireplace", de: "Raketenofen, Holzofen oder Feuerstelle" }, { v: "electric", en: "Induction plate or kettle, run from the power station or the car", de: "Induktionsplatte oder Wasserkocher an Powerstation oder Auto" }, { v: "none", en: "I can't", de: "Gar nicht", only1: true }] },
  { id: "vit", type: "choice", en: "Something with vitamins that keeps (tinned fruit, juice, sauerkraut)?", de: "Etwas mit Vitaminen, das hält (Obstkonserven, Saft, Sauerkraut)?", opts: yn },
  // herb room: health
  { id: "aid", type: "multi", en: "First aid", de: "Erste Hilfe", hint: TICK,
    opts: [{ v: "kit", en: "First-aid kit at home", de: "Verbandkasten zu Hause" }, { v: "course", en: "First-aid course in the last 5 years", de: "Erste-Hilfe-Kurs in den letzten 5 Jahren" }, NONE] },
  { id: "meds", type: "choice", en: "Regular medicines for at least 4 weeks?", de: "Regelmäßige Medikamente für mindestens 4 Wochen?",
    opts: [yes, no, { v: "na", en: "Nobody needs any", de: "Niemand braucht welche" }] },
  // gatehouse: safety and cash
  { id: "safety", type: "multi", en: "Safety equipment at home (tick all)", de: "Sicherheitsausrüstung zu Hause (alle ankreuzen)",
    hint: { en: "In real outages, people die of carbon monoxide from grills, generators and gas stoves used for heating.", de: "Bei echten Stromausfällen sterben Menschen an Kohlenmonoxid von Grills, Generatoren und Gasherden zum Heizen." },
    opts: [{ v: "co", en: "Battery CO alarm", de: "CO-Melder mit Batterie" }, { v: "smoke", en: "Smoke alarms", de: "Rauchmelder" }, { v: "blanket", en: "Fire blanket", de: "Löschdecke" }, { v: "ext", en: "Fire extinguisher", de: "Feuerlöscher" }, NONE] },
  { id: "cash", type: "choice", en: "Cash at home in small notes?", de: "Bargeld zu Hause in kleinen Scheinen?",
    opts: [{ v: "none", en: "None", de: "Keins" }, { v: "some", en: "Less than €100 per person", de: "Weniger als 100 € pro Person" }, { v: "enough", en: "€100 or more per person", de: "100 € oder mehr pro Person" }] },
  // great hall: people
  { id: "neigh", type: "choice", en: "How many neighbours do you know well enough to knock on their door?", de: "Wie viele Nachbarn kennst du gut genug, um zu klingeln?",
    opts: [{ v: "0", en: "None", de: "Keine" }, { v: "1", en: "1–2", de: "1–2" }, { v: "3", en: "3 or more", de: "3 oder mehr" }] },
  { id: "refuge", type: "choice", en: "Have you agreed with someone: who you would take in, or where you would go if your home can't hold?", de: "Habt ihr abgesprochen, wen ihr aufnehmt oder wohin ihr geht, wenn euer Zuhause nicht hält?", opts: yn },
  // bard's corner: spirits
  { id: "mind", type: "choice", en: "Books, cards, games – things to do without power?", de: "Bücher, Karten, Spiele – Beschäftigung ohne Strom?", opts: yn }
];
const HOUSEHOLD_Q = ["adults", "kids", "frail", "home", "floor", "tenure", "area", "climate"];

/* ---------- the engine ---------- */
const LVL = { en: ["Not yet safe", "Survive", "Okay", "Comfortable"], de: ["Noch nicht sicher", "Überleben", "Gut", "Komfortabel"] };
const NEEDS = [
  { id: "warmth", room: "hearth", icon: "🔥", en: "Warmth", de: "Wärme" },
  { id: "water", room: "well", icon: "💧", en: "Water", de: "Wasser" },
  { id: "food", room: "kitchen", icon: "🥫", en: "Food", de: "Essen" },
  { id: "light", room: "lantern", icon: "🏮", en: "Light & information", de: "Licht & Information" },
  { id: "toilet", room: "well", icon: "🚽", en: "Toilet & hygiene", de: "Toilette & Hygiene" }
];

// Can the household cook on electricity without the grid? (induction plate at about 1 kW)
function elecCook(a) {
  const out = +a.station_out || { small: 300, mid: 1200, big: 2000 }[a.power] || 0;
  return { ok: has(a, "car", "v2l") || a.generator === "yes" || (a.sine === "yes" && out >= 1000), out };
}
function assess(a) {
  a = normalize({ ...a });
  const n = k => +a[k] || 0, adults = Math.max(1, n("adults")), kids = n("kids"), P = adults + kids;
  const links = [], add = (id, room, need, s, en, de) => links.push({ id, room, need, s, en, de });
  const lv = {}, why = {};
  const cookOK = has(a, "cook", "gas", "camping", "wood") || (has(a, "cook", "electric") && elecCook(a).ok);
  const ev = has(a, "car", "ev", "v2l"), v2l = has(a, "car", "v2l"), ice = has(a, "car", "ice");
  const station = (a.power === "mid" || a.power === "big") && a.sine === "yes";
  const powerSrc = station || v2l || a.generator === "yes";
  const recharge = a.solar === "yes" || ev || a.generator === "yes" || ice;
  const rent = a.tenure === "rent";

  /* warmth */
  const sleepAll = a.sleep === "all", layers = a.tent === "yes" || a.blankets === "yes", room = a.warmroom === "yes";
  const base = sleepAll && layers && room;
  if (!sleepAll) add("w-bags", "hearth", "warmth", a.sleep === "some" ? "a" : "r",
    "Get a warm sleeping bag (comfort about 0 °C, ~€40) for everyone who has none. At night it keeps you safe even in a cold room.",
    "Für alle ohne einen warmen Schlafsack besorgen (Komfort etwa 0 °C, ~40 €). Nachts hält er auch im kalten Raum sicher warm.");
  if (!layers) add("w-tent", "hearth", "warmth", "a",
    "Plan a tent inside the warm room (any camping tent, a blanket over it) or blankets hung around the beds: 5–8 °C warmer inside.",
    "Ein Zelt im warmen Raum einplanen (jedes Campingzelt, eine Decke darüber) oder Decken um die Betten hängen: innen 5–8 °C wärmer.");
  if (!room) add("w-room", "hearth", "warmth", "a",
    "Choose your warm room today: the smallest room with the fewest outside walls. Have a blanket ready to cover its window.",
    "Heute den warmen Raum festlegen: den kleinsten Raum mit den wenigsten Außenwänden. Eine Decke fürs Fenster bereitlegen.");
  // every heat source the household ticked is tried; the best one counts
  const H = arr(a.heating); let heat = 1, heatWhy = { en: "Your heating stops without power. Warmth comes from people, layers and the warm room.", de: "Deine Heizung steht ohne Strom. Wärme kommt von Menschen, Schichten und dem warmen Raum." }, heatLinks = [];
  const tryPath = (h, w, l) => { if (h > heat) { heat = h; heatWhy = w; heatLinks = l; } };
  if (H.includes("gas_own") || H.includes("oil")) {
    const L = [], mk = (id, room, need, s, en, de) => L.push({ id, room, need, s, en, de });
    const plug = a.plug === "yes", w = H.includes("oil") ? "100–250 W, 3–8 h" : "50–100 W, 8–17 h";
    if (plug && powerSrc) {
      const strong = a.power === "big" || v2l || a.generator === "yes";
      if (!recharge && !strong) mk("p-recharge", "workshop", "warmth", "a", "Add a way to recharge the power station: a foldable solar panel (~€100–200) or the car.", "Eine Möglichkeit zum Nachladen: ein faltbares Solarpanel (~100–200 €) oder das Auto.");
      tryPath(recharge || strong ? 3 : 2, { en: `Your boiler can run on battery power (about ${w} per kWh). Heat the house in bursts, keep the warm room warm.`, de: `Deine Heizung kann am Akku laufen (etwa ${w} pro kWh). Das Haus in Schüben heizen, den warmen Raum warm halten.` }, L);
    } else {
      if (!plug) mk("p-plug", "workshop", "warmth", "a",
        rent ? "Ask your landlord to have an electrician fit a plug or changeover switch on the boiler. One visit; it is the most common missing link."
             : "Have an electrician fit a plug or changeover switch on the boiler. One visit; it is the most common missing link.",
        rent ? "Den Vermieter bitten, eine Elektrofachkraft einen Stecker oder Umschalter an der Heizung setzen zu lassen. Ein Termin; das ist das häufigste fehlende Glied."
             : "Eine Elektrofachkraft einen Stecker oder Umschalter an der Heizung setzen lassen. Ein Termin; das ist das häufigste fehlende Glied.");
      if (!powerSrc) mk("p-station", "workshop", "warmth", "a",
        ev ? "A power station of about 1 kWh with pure-sine 230 V (~€400–700), charged from the car's 12 V socket or a solar panel, runs the boiler a few hours a day."
           : "A power station of about 1 kWh with pure-sine 230 V (~€400–700) runs the boiler a few hours a day; with a solar panel it recharges.",
        ev ? "Eine Powerstation mit etwa 1 kWh und reinem Sinus (~400–700 €), geladen über die 12-V-Buchse des Autos oder ein Solarpanel, betreibt die Heizung ein paar Stunden am Tag."
           : "Eine Powerstation mit etwa 1 kWh und reinem Sinus (~400–700 €) betreibt die Heizung ein paar Stunden am Tag; mit Solarpanel lädt sie nach.");
      heatLinks = L; heatWhy = { en: `Your boiler needs 230 V (about ${w} per kWh of battery). One link is missing, so it stays cold.`, de: `Deine Heizung braucht 230 V (etwa ${w} pro kWh Akku). Ein Glied fehlt, also bleibt sie kalt.` };
    }
  } else if (H.includes("central")) heatWhy = { en: "Central and district heating depend on pumps you can't reach. Plan with the warm room.", de: "Zentral- und Fernwärme hängen an Pumpen, an die du nicht herankommst. Plane mit dem warmen Raum." };
  else if (H.includes("heatpump") || H.includes("electric")) heatWhy = { en: "Your heating needs several kW, far more than a power station gives. Plan with the warm room.", de: "Deine Heizung braucht mehrere kW, weit mehr als eine Powerstation liefert. Plane mit dem warmen Raum." };
  if (H.includes("wood")) {
    const L = a.wood === "yes" ? [] : [{ id: "w-wood", room: "hearth", need: "warmth", s: "a", en: "Store dry wood for 4 weeks. Your home can become the street's warm room.", de: "Trockenes Holz für 4 Wochen lagern. Dein Zuhause kann der warme Raum der Straße werden." }];
    const h = a.wood === "yes" ? 3 : 2;
    if (h > heat || (h === heat && heatLinks.length)) { heat = h; heatWhy = { en: "Your stove runs without power.", de: "Dein Ofen läuft ohne Strom." }; heatLinks = L; }
  }
  links.push(...heatLinks);
  lv.warmth = heat >= 2 ? (base ? heat : heat - 1) : (base ? 1 : 0); why.warmth = heatWhy;

  /* water */
  const d = Math.floor(n("water_l") / (P * 2)), treatOK = has(a, "treat", "filter", "tabs") || (has(a, "treat", "boil") && cookOK);
  lv.water = d >= GOAL ? 3 : treatOK && d >= 14 && a.canisters === "yes" ? 2 : treatOK && d >= 7 ? 1 : 0;
  why.water = { en: `Stored water lasts about ${d} days for ${P}.` + (treatOK ? " You can make other water safe." : ""), de: `Der Wasservorrat reicht für ${P} etwa ${d} Tage.` + (treatOK ? " Anderes Wasser kannst du trinkbar machen." : "") };
  if (!treatOK) add("h-filter", "well", "water", "r", "Get a water filter (hollow fibre, ~€25) or disinfection tablets. When the stored water is gone, it makes rain or well water drinkable.", "Einen Wasserfilter (Hohlfaser, ~25 €) oder Entkeimungstabletten besorgen. Wenn der Vorrat leer ist, macht er Regen- oder Brunnenwasser trinkbar.");
  if (d < 14) { const more = Math.ceil(P * 2 * 14 - n("water_l"));
    add("h-store", "well", "water", d < 7 ? "r" : "a", `Store ${more} L more to reach 14 days: tap water in food-grade canisters, dark and cool, renewed about every 6 months.`, `${more} L mehr lagern für 14 Tage: Leitungswasser in lebensmittelechten Kanistern, dunkel und kühl, etwa alle 6 Monate erneuern.`); }
  if (a.canisters !== "yes") add("h-cans", "well", "water", "a", "Keep a few empty canisters to fetch water from the emergency well, and find out today where it is.", "Ein paar leere Kanister bereithalten, um Wasser vom Notbrunnen zu holen, und heute herausfinden, wo er ist.");
  if (a.home === "flat" && a.floor !== "low") add("h-floor", "well", "water", "a", "Upper floors lose water first. At the first minute of an outage, fill the bathtub, pots and bottles.", "Obere Stockwerke verlieren zuerst das Wasser. In der ersten Minute Badewanne, Töpfe und Flaschen füllen.");

  /* toilet */
  lv.toilet = a.toilet === "yes" ? (a.hygiene === "yes" ? 2 : 1) : 0;
  why.toilet = { en: "Without power, sewage pumps can stop too.", de: "Ohne Strom können auch Abwasserpumpen ausfallen." };
  if (a.toilet !== "yes") add("t-kit", "well", "toilet", "r", "Prepare an emergency toilet: bucket with lid, strong bin bags, cat litter or sawdust (~€15).", "Nottoilette vorbereiten: Eimer mit Deckel, feste Müllbeutel, Katzenstreu oder Sägespäne (~15 €).");
  if (a.hygiene !== "yes") add("t-hyg", "well", "toilet", "a", "Soap, wet wipes and disinfectant for 4 weeks. Dirty hands are the fastest way to get ill.", "Seife, Feuchttücher und Desinfektion für 4 Wochen. Schmutzige Hände machen am schnellsten krank.");

  /* food */
  const f = +a.food || 0, stretch = Math.round(f * 1.3);
  lv.food = f >= GOAL && cookOK && a.vit === "yes" ? 3 : f >= GOAL && cookOK ? 2 : stretch >= GOAL ? 1 : 0;
  why.food = { en: f ? `Your food lasts about ${f} days, about ${Math.min(stretch, 60)} if adults eat less. Children eat normally.` : "No food stock counted yet.", de: f ? `Dein Essen reicht etwa ${f} Tage, etwa ${Math.min(stretch, 60)}, wenn Erwachsene weniger essen. Kinder essen normal.` : "Noch kein Vorrat gezählt." };
  if (f < GOAL) add("f-stock", "kitchen", "food", stretch < GOAL ? "r" : "a",
    `Stock food for 4 weeks. Per adult roughly: 4 kg oats, 3 kg rice or pasta, 2 kg lentils, 1 L oil, 1 kg nuts or peanut butter (about 47,000 kcal, 11 kg). For your ${adults} adult${adults > 1 ? "s" : ""}: × ${adults}${kids ? `, plus full portions for ${kids} child${kids > 1 ? "ren" : ""}` : ""}.`,
    `Vorrat für 4 Wochen anlegen. Pro Erwachsenem etwa: 4 kg Haferflocken, 3 kg Reis oder Nudeln, 2 kg Linsen, 1 L Öl, 1 kg Nüsse oder Erdnussbutter (etwa 47.000 kcal, 11 kg). Für eure ${adults} Erwachsenen: × ${adults}${kids ? `, dazu volle Portionen für ${kids} Kind${kids > 1 ? "er" : ""}` : ""}.`);
  if (!cookOK) add("f-stove", "kitchen", "food", "a", "A camping stove with fuel, or a rocket stove for outdoors (~€30–60): one hot meal a day. Flour and lentils need cooking; oats don't.", "Ein Campingkocher mit Brennstoff oder ein Raketenofen für draußen (~30–60 €): eine warme Mahlzeit am Tag. Mehl und Linsen müssen gekocht werden, Haferflocken nicht.");
  if (a.vit !== "yes") add("f-vit", "kitchen", "food", "a", "Tinned fruit, juice or sauerkraut: not needed to survive 4 weeks, but good for morale and a margin.", "Obstkonserven, Saft oder Sauerkraut: zum Überleben von 4 Wochen nicht nötig, aber gut für Stimmung und Reserve.");

  /* light and information */
  const phone = a.banks === "yes" || (a.power && a.power !== "none") || v2l;
  lv.light = !(a.light === "yes" && a.radio === "yes") ? 0 : phone && recharge ? 3 : phone ? 2 : 1;
  why.light = { en: "Light for safety, the radio for news when phones fail.", de: "Licht für die Sicherheit, das Radio für Nachrichten, wenn Handys ausfallen." };
  if (a.light !== "yes") add("l-lamp", "lantern", "light", "r", "A headlamp per person with spare batteries. Safer than candles.", "Eine Stirnlampe pro Person mit Ersatzbatterien. Sicherer als Kerzen.");
  if (a.radio !== "yes") add("l-radio", "signal", "light", "a", "A crank or battery radio (~€25). Public radio keeps broadcasting when the phone network is down.", "Ein Kurbel- oder Batterieradio (~25 €). Der öffentliche Rundfunk sendet weiter, wenn das Handynetz weg ist.");
  if (!phone) add("l-bank", "lantern", "light", "a", "A 20,000 mAh power bank (~€25), kept charged: about 3–4 phone charges.", "Eine Powerbank mit 20.000 mAh (~25 €), geladen halten: etwa 3–4 Handyladungen.");
  else if (!recharge) add("l-solar", "lantern", "light", "a", "A small foldable solar panel to recharge power banks and lamps for weeks.", "Ein kleines faltbares Solarpanel, um Powerbanks und Lampen wochenlang nachzuladen.");

  /* safety, health, people, spirits, signal */
  if (!has(a, "safety", "co")) add("g-co", "gate", "safety", "r", "Get a battery CO alarm (EN 50291, ~€25) for the warm room. Never heat with grills, gas stoves or generators indoors.", "Einen CO-Melder mit Batterie (EN 50291, ~25 €) für den warmen Raum besorgen. Nie mit Grill, Gasherd oder Generator drinnen heizen.");
  if (!has(a, "safety", "blanket", "ext")) add("g-fire", "gate", "safety", "a", "A fire blanket (~€15) or 6 L foam extinguisher in the kitchen: candles and stoves indoors raise the fire risk.", "Eine Löschdecke (~15 €) oder ein 6-L-Schaumlöscher in der Küche: Kerzen und Öfen drinnen erhöhen das Brandrisiko.");
  if (a.cash !== "enough") add("g-cash", "gate", "safety", "a", "Cash in small notes: at least €100 per person. Card payments and ATMs stop with the power; and cash can't buy what isn't there.", "Bargeld in kleinen Scheinen: mindestens 100 € pro Person. Karten und Geldautomaten fallen mit dem Strom aus; und Bargeld kauft nicht, was es nicht gibt.");
  if (!has(a, "aid", "kit")) add("m-kit", "herbs", "health", "r", "A first-aid kit (a car kit is a good start) and a first-aid course: after the first week, doctors are hard to reach.", "Verbandkasten (ein Kfz-Verbandkasten reicht für den Anfang) und Erste-Hilfe-Kurs: nach der ersten Woche sind Ärzte kaum erreichbar.");
  else if (!has(a, "aid", "course")) add("m-course", "herbs", "health", "a", "Book a first-aid course. When help doesn't come, you are the help.", "Einen Erste-Hilfe-Kurs buchen. Wenn keine Hilfe kommt, bist du die Hilfe.");
  if (a.meds === "no") add("m-meds", "herbs", "health", "r", "Ask your doctor how to keep a 4-week reserve of the medicines you need.", "Mit der Ärztin oder dem Arzt klären, wie du eine 4-Wochen-Reserve deiner Medikamente anlegst.");
  if (a.neigh === "0") add("p-neigh", "hall", "people", "r", "Introduce yourself to three neighbours: names, flats, what each of you can do.", "Stell dich drei Nachbarn vor: Namen, Wohnungen, wer was kann.");
  else if (a.neigh === "1") add("p-neigh2", "hall", "people", "a", "Get to know one or two more neighbours and agree on a meeting place and time.", "Ein, zwei Nachbarn mehr kennenlernen und Treffpunkt und Uhrzeit vereinbaren.");
  if (a.refuge !== "yes") add("p-refuge", "hall", "people", n("frail") ? "r" : "a", "Agree with someone now: who you would take into your warm room, or where you would go if your home can't hold.", "Jetzt mit jemandem absprechen: wen ihr in euren warmen Raum aufnehmt, oder wohin ihr geht, wenn euer Zuhause nicht hält.");
  if (a.famplan !== "yes") add("s-fam", "signal", "people", "a", "Know how you reach family and friends without phones: their house if it is within walking distance, otherwise an agreed place and times. And find out who nearby is in the volunteer fire brigade or the Red Cross: that is your link to help.", "Wisse, wie du Familie und Freunde ohne Handy erreichst: ihr Zuhause, wenn es zu Fuß erreichbar ist, sonst ein abgesprochener Ort mit Uhrzeiten. Und finde heraus, wer in der Nähe bei der Freiwilligen Feuerwehr oder dem Roten Kreuz ist: das ist deine Verbindung zur Hilfe.");
  if (a.meet !== "yes") add("s-meet", "signal", "people", "a", "Find your town's emergency point (Notfall-Treffpunkt / Kat-Leuchtturm) and write it on the communication card.", "Den Notfall-Treffpunkt / Kat-Leuchtturm deiner Gemeinde herausfinden und auf die Kommunikationskarte schreiben.");
  if (a.mind !== "yes") add("b-mind", "bard", "mind", "a", "Books, cards, board games and a daily routine. Week two is when spirits drop.", "Bücher, Karten, Brettspiele und ein fester Tagesablauf. In Woche zwei sinkt die Stimmung.");
  if (a.tools !== "yes") add("k-tools", "workshop", "safety", "a", "A small toolbox, and find the main water valve, fuse box and gas valve today. In frost without heating, drain the pipes before they burst.", "Ein kleiner Werkzeugkasten, und heute Hauptwasserhahn, Sicherungskasten und Gashahn suchen. Bei Frost ohne Heizung die Leitungen leeren, bevor sie platzen.");

  /* verdict: can this home hold at all? */
  let verdict = null;
  if (a.climate === "hot") verdict = { s: "r", en: "In extreme heat, a home without power for weeks can't be kept safe. Plan now where you would go, and leave early.", de: "Bei extremer Hitze lässt sich ein Zuhause ohne Strom über Wochen nicht sicher halten. Plane jetzt, wohin ihr geht, und geht früh." };
  else if (a.climate === "cold" && lv.warmth < 2) verdict = { s: "r", en: "In long hard frost, a home without working heat won't hold for 28 days. Agree on a warm place now and move early.", de: "Bei langem hartem Frost hält ein Zuhause ohne funktionierende Heizung keine 28 Tage. Jetzt einen warmen Ort vereinbaren und früh umziehen." };
  else if (lv.warmth === 0 && n("frail")) verdict = { s: "a", en: "Someone in your home is frail and your home can't yet keep people warm. Until it can, plan for them to stay somewhere warm.", de: "In deinem Haushalt ist jemand gebrechlich, und euer Zuhause kann noch niemanden warm halten. Bis es das kann, plant einen warmen Ort für diese Person." };
  if (a.area === "city" && a.home === "flat" && a.floor === "high") links.push({ id: "c-city", room: "hall", need: "people", s: "a", en: "A high-rise in a big city is the hardest place for 28 days: no lift, no water, no food coming in. Is there somewhere in the countryside you could go, and when would you leave?", de: "Ein Hochhaus in der Großstadt ist der schwerste Ort für 28 Tage: kein Aufzug, kein Wasser, kein Nachschub. Gibt es einen Ort auf dem Land, und wann würdet ihr gehen?" });

  /* nights the castle holds: the shortest of water, food, warmth, toilet */
  const nWater = treatOK ? GOAL : d, nFood = Math.min(GOAL, stretch), nWarm = lv.warmth >= 1 ? GOAL : a.sleep === "some" ? 10 : 3, nToilet = a.toilet === "yes" ? GOAL : 7;
  const parts = [["well", nWater], ["kitchen", nFood], ["hearth", nWarm], ["well", nToilet]];
  if (verdict && verdict.s === "r") parts.push(["hearth", 3]);
  parts.sort((x, y) => x[1] - y[1]);
  const rank = { r: 0, a: 1 }, needRank = ["warmth", "safety", "water", "food", "health", "toilet", "light", "people", "mind"];
  links.sort((x, y) => rank[x.s] - rank[y.s] || needRank.indexOf(x.need) - needRank.indexOf(y.need));
  return { lv, why, links, verdict, nights: { n: Math.max(0, Math.min(GOAL, parts[0][1])), weak: parts[0][1] < GOAL ? parts[0][0] : null } };
}

/* ---------- exact numbers for the equipment (optional) ---------- */
Q.push(
  { id: "station_wh", type: "num", min: 0, only: a => a.power && a.power !== "none", en: "Power station capacity in Wh (on the label)", de: "Kapazität der Powerstation in Wh (steht auf dem Gerät)" },
  { id: "station_out", type: "num", min: 0, only: a => a.power && a.power !== "none", en: "Power station output in W (continuous, on the label)", de: "Dauerleistung der Powerstation in W (steht auf dem Gerät)",
    hint: { en: "An induction plate on a low setting needs about 1,000 W; a kettle about 2,000 W.", de: "Eine Induktionsplatte auf niedriger Stufe braucht etwa 1.000 W, ein Wasserkocher etwa 2.000 W." } },
  { id: "solar_w", type: "num", min: 0, only: a => a.solar === "yes", en: "Solar panel power in watts", de: "Leistung des Solarpanels in Watt" },
  { id: "ev_kwh", type: "num", min: 0, only: a => has(a, "car", "ev", "v2l"), en: "Car battery in kWh", de: "Autobatterie in kWh" }
);

/* ---------- what the system can and can't do ---------- */
const fmtN = v => Math.round(v).toLocaleString(typeof lang === "string" ? lang : "en");
function caps(a) {
  a = normalize({ ...a });
  const out = [], ok = (y, en, de) => out.push({ y, en, de });
  const n = k => +a[k] || 0, P = Math.max(1, n("adults")) + n("kids");
  const sizeWh = { small: 300, mid: 1000, big: 2000 }[a.power] || 0, wh = n("station_wh") || sizeWh;
  const sine = a.sine === "yes", ev = has(a, "car", "ev", "v2l"), v2l = has(a, "car", "v2l"), evk = n("ev_kwh");
  const solarDay = a.solar === "yes" ? (n("solar_w") || 100) * 0.8 : 0; // winter in Central Europe: roughly 0.5–1 kWh per kWp a day
  const carDay = ev ? 1500 : has(a, "car", "ice") ? 1000 : 0;               // 12 V socket, about 100 W for many hours
  const boilW = has(a, "heating", "oil") ? 175 : has(a, "heating", "gas_own") ? 75 : 0;
  // heating
  if (has(a, "heating", "wood")) ok(a.wood === "yes", "Heating: the wood stove heats without power" + (a.wood === "yes" ? "." : ", but the wood for 4 weeks is missing."), "Heizen: der Holzofen heizt ohne Strom" + (a.wood === "yes" ? "." : ", aber das Holz für 4 Wochen fehlt."));
  if (boilW) {
    const missing = [];
    if (a.plug !== "yes") missing.push({ en: "a plug on the boiler", de: "ein Stecker an der Heizung" });
    if (!((wh && sine) || v2l || a.generator === "yes")) missing.push({ en: "a power source with pure-sine 230 V", de: "eine Stromquelle mit reinem Sinus 230 V" });
    if (missing.length) ok(false, `Heating: the boiler can't run. Missing: ${missing.map(m => m.en).join(" and ")}.`, `Heizen: die Heizung kann nicht laufen. Es fehlt: ${missing.map(m => m.de).join(" und ")}.`);
    else {
      const per = wh ? Math.round(wh * 0.85 / boilW) : 0, daily = solarDay + carDay, dh = Math.round(daily * 0.85 / boilW);
      ok(true, `Heating: the boiler runs about ${per} h per charge of the power station` + (daily ? `, and recharging (${[solarDay ? "solar" : "", carDay ? "car" : ""].filter(Boolean).join(" + ")}) adds about ${dh} h a day.` : ".") + (v2l ? " The car's 230 V socket can also run it directly." : ""),
             `Heizen: die Heizung läuft etwa ${per} h pro Akkuladung` + (daily ? `, und Nachladen (${[solarDay ? "Solar" : "", carDay ? "Auto" : ""].filter(Boolean).join(" + ")}) bringt etwa ${dh} h pro Tag.` : ".") + (v2l ? " Die 230-V-Steckdose des Autos kann sie auch direkt betreiben." : ""));
    }
  } else if (!has(a, "heating", "wood")) ok(false, "Heating: it can't run without grid power. Warmth comes from the warm room, layers and the tent.", "Heizen: ohne Netzstrom läuft sie nicht. Wärme kommt vom warmen Raum, Schichten und dem Zelt.");
  ok(a.sleep === "all" && (a.tent === "yes" || a.blankets === "yes"), a.sleep === "all" ? `Sleeping warm: sleeping bags for all ${P}` + (a.tent === "yes" ? ", and a tent for the warm room." : ".") : "Sleeping warm: not everyone has a warm sleeping bag yet.",
     a.sleep === "all" ? `Warm schlafen: Schlafsäcke für alle ${P}` + (a.tent === "yes" ? ", und ein Zelt für den warmen Raum." : ".") : "Warm schlafen: noch nicht alle haben einen warmen Schlafsack.");
  // power reservoir
  if (ev && evk) ok(true, `Car battery: about ${evk} kWh. Through the 12 V socket (about 1–2 kWh a day) it can recharge the power station for the whole 28 days.`, `Autobatterie: etwa ${evk} kWh. Über die 12-V-Buchse (etwa 1–2 kWh am Tag) kann sie die Powerstation die ganzen 28 Tage nachladen.`);
  if (wh) ok(true, `Power station: ${fmtN(wh)} Wh ≈ ${Math.round(wh * 0.85 / 15)} phone charges or about ${Math.round(wh * 0.85 / 5)} hours of LED light per charge.` + (solarDay ? ` The panel adds about ${fmtN(solarDay)} Wh on a winter day, more when sunny.` : ""),
                `Powerstation: ${fmtN(wh)} Wh ≈ ${Math.round(wh * 0.85 / 15)} Handyladungen oder etwa ${Math.round(wh * 0.85 / 5)} Stunden LED-Licht pro Ladung.` + (solarDay ? ` Das Panel bringt an einem Wintertag etwa ${fmtN(solarDay)} Wh, bei Sonne mehr.` : ""));
  const ec = elecCook(a), meal = 0.1 * P + 0.05; // kWh for one hot meal: about 15–20 min at ~1 kW for a pot for the household
  if (has(a, "cook", "electric") || wh) {
    if (ec.ok) ok(true, `Cooking on electricity: an induction plate on a low setting (about 1 kW) works` + (wh ? `. One hot meal for ${P} uses about ${fmtN(meal * 1000)} Wh, so about ${Math.max(1, Math.floor(wh * 0.85 / 1000 / meal))} meals per charge; it shares the battery with the heating.` : "."),
                        `Elektrisch kochen: eine Induktionsplatte auf niedriger Stufe (etwa 1 kW) geht` + (wh ? `. Eine warme Mahlzeit für ${P} braucht etwa ${fmtN(meal * 1000)} Wh, also etwa ${Math.max(1, Math.floor(wh * 0.85 / 1000 / meal))} Mahlzeiten pro Ladung; sie teilt sich den Akku mit der Heizung.` : "."));
    else ok(false, `Cooking on electricity: an induction plate needs about 1,000 W; this power station gives ${ec.out ? fmtN(ec.out) + " W" : "too little"}.`, `Elektrisch kochen: eine Induktionsplatte braucht etwa 1.000 W; diese Powerstation liefert ${ec.out ? fmtN(ec.out) + " W" : "zu wenig"}.`);
  }
  // cooking, water, food, info, cash
  const CT = { gas: ["gas hob", "Gasherd"], camping: ["camping stove", "Campingkocher"], wood: ["rocket or wood stove", "Raketen- oder Holzofen"], electric: ["induction plate on battery power", "Induktionsplatte am Akku"] };
  const cs = arr(a.cook).filter(x => CT[x] && (x !== "electric" || ec.ok)), cookTxt = cs.length ? [cs.map(x => CT[x][0]).join(", "), cs.map(x => CT[x][1]).join(", ")] : null;
  ok(!!cookTxt, cookTxt ? `Cooking without power: ${cookTxt[0]}.` : "Cooking without power: not possible yet. Oats, tins and nuts need no fire.", cookTxt ? `Kochen ohne Strom: ${cookTxt[1]}.` : "Kochen ohne Strom: noch nicht möglich. Haferflocken, Konserven und Nüsse brauchen kein Feuer.");
  const d = Math.floor(n("water_l") / (P * 2)), tr = has(a, "treat", "filter", "tabs");
  ok(d >= 14 || tr, `Water: ${n("water_l")} L stored ≈ ${d} days for ${P}.` + (tr ? " After that, filter or tablets make rain or well water drinkable." : " Nothing to make other water safe."), `Wasser: ${n("water_l")} L Vorrat ≈ ${d} Tage für ${P}.` + (tr ? " Danach machen Filter oder Tabletten Regen- oder Brunnenwasser trinkbar." : " Nichts, um anderes Wasser trinkbar zu machen."));
  const f = +a.food || 0;
  ok(f >= GOAL, `Food: about ${f} days at normal eating, about ${Math.round(f * 1.3)} if adults eat less.`, `Essen: etwa ${f} Tage bei normalem Essen, etwa ${Math.round(f * 1.3)}, wenn Erwachsene weniger essen.`);
  ok(a.radio === "yes", a.radio === "yes" ? "News: radio works without the phone network." : "News: no radio, so no news once the phone network is down.", a.radio === "yes" ? "Nachrichten: das Radio geht auch ohne Handynetz." : "Nachrichten: kein Radio, also keine Nachrichten, wenn das Handynetz weg ist.");
  ok(has(a, "safety", "co"), has(a, "safety", "co") ? "CO alarm: in place, so the stove in the warm room is watched." : "CO alarm: missing. Get one before you light any stove indoors.", has(a, "safety", "co") ? "CO-Melder: vorhanden, der Ofen im warmen Raum ist überwacht." : "CO-Melder: fehlt. Vor dem ersten Ofen drinnen besorgen.");
  ok(a.cash === "enough", a.cash === "enough" ? "Cash: enough at home." : "Cash: not enough at home; cards and ATMs stop with the power.", a.cash === "enough" ? "Bargeld: genug zu Hause." : "Bargeld: zu wenig zu Hause; Karten und Automaten fallen mit dem Strom aus.");
  return out;
}

/* ---------- errands: what to buy or do, where ---------- */
const STORES = {
  bank: { icon: "🏧", en: "Bank or ATM", de: "Bank oder Geldautomat", q: { en: "ATM", de: "Geldautomat" }, h: [[0, 24], [0, 24]], hint: { en: "ATMs: day and night", de: "Automaten: Tag und Nacht" } },
  super: { icon: "🛒", en: "Supermarket", de: "Supermarkt", q: { en: "supermarket", de: "Supermarkt" }, h: [[8, 20], null], hint: { en: "Typically Mon–Sat 8–20", de: "Meist Mo–Sa 8–20 Uhr" } },
  drug: { icon: "🧴", en: "Drugstore", de: "Drogerie", q: { en: "drugstore", de: "Drogerie" }, h: [[8, 20], null], hint: { en: "Typically Mon–Sat 8–20", de: "Meist Mo–Sa 8–20 Uhr" } },
  pharm: { icon: "💊", en: "Pharmacy", de: "Apotheke", q: { en: "pharmacy", de: "Apotheke" }, h: [[8, 18], null], sat: 13, hint: { en: "Typically Mon–Fri 8–18:30, Sat 8–13; emergency pharmacy at night", de: "Meist Mo–Fr 8–18:30, Sa 8–13 Uhr; nachts Notdienst" } },
  hard: { icon: "🔨", en: "Hardware store (DIY)", de: "Baumarkt", q: { en: "hardware store", de: "Baumarkt" }, h: [[8, 20], null], hint: { en: "Typically Mon–Sat 8–20", de: "Meist Mo–Sa 8–20 Uhr" } },
  outdoor: { icon: "⛺", en: "Outdoor or camping shop", de: "Outdoor- oder Campingladen", q: { en: "outdoor shop", de: "Outdoor Laden" }, h: [[10, 19], null], hint: { en: "Typically Mon–Sat 10–19; or order online today", de: "Meist Mo–Sa 10–19 Uhr; oder heute online bestellen" } },
  elec: { icon: "🔌", en: "Electronics store", de: "Elektronikmarkt", q: { en: "electronics store", de: "Elektronikmarkt" }, h: [[10, 20], null], hint: { en: "Typically Mon–Sat 10–20; or order online today", de: "Meist Mo–Sa 10–20 Uhr; oder heute online bestellen" } },
  call: { icon: "📞", en: "Phone calls", de: "Anrufe", h: [[8, 17], null], workdays: true, hint: { en: "Offices: Mon–Fri", de: "Büros: Mo–Fr" } },
  home: { icon: "🏠", en: "At home", de: "Zu Hause" },
  people: { icon: "🤝", en: "Neighbours and family", de: "Nachbarn und Familie" }
};
const STORE_ORDER = ["bank", "super", "drug", "pharm", "hard", "outdoor", "elec", "call", "home", "people"];
function errands(a, links) {
  a = normalize({ ...a });
  const n = k => +a[k] || 0, adults = Math.max(1, n("adults")), kids = n("kids"), P = adults + kids;
  const F = adults + kids * 0.7, f = +a.food || 0, miss = Math.max(0, GOAL - f) / GOAL;
  const kg = per => Math.max(1, Math.ceil(per * F * miss));
  const water = Math.max(0, Math.ceil(P * 2 * 14 - n("water_l")));
  const M = {
    "w-bags": [["outdoor", "Warm sleeping bags (comfort about 0 °C) for everyone without one", "Warme Schlafsäcke (Komfort etwa 0 °C) für alle ohne einen"]],
    "w-tent": [["outdoor", "A camping tent for the warm room (2–3 people), or use blankets you have", "Ein Campingzelt für den warmen Raum (2–3 Personen), oder vorhandene Decken nehmen"]],
    "w-room": [["home", "Choose the warm room; lay a blanket ready for its window", "Den warmen Raum festlegen; eine Decke fürs Fenster bereitlegen"]],
    "w-wood": [["call", "Order dry firewood for 4 weeks", "Trockenes Brennholz für 4 Wochen bestellen"]],
    "p-plug": [["call", a.tenure === "rent" ? "Landlord: ask for an electrician to fit a plug or changeover switch on the boiler" : "Electrician: appointment to fit a plug or changeover switch on the boiler", a.tenure === "rent" ? "Vermieter: Elektrofachkraft für Stecker oder Umschalter an der Heizung anfragen" : "Elektrofachkraft: Termin für Stecker oder Umschalter an der Heizung"]],
    "p-station": [["elec", "Power station about 1 kWh, pure-sine 230 V" + (has(a, "car", "ev", "v2l") ? ", plus its 12 V car charging cable" : ""), "Powerstation etwa 1 kWh, reiner Sinus 230 V" + (has(a, "car", "ev", "v2l") ? ", dazu das 12-V-Ladekabel fürs Auto" : "")]],
    "p-recharge": [["elec", "Foldable solar panel 100–200 W that fits the power station's input", "Faltbares Solarpanel 100–200 W, passend zum Eingang der Powerstation"]],
    "h-filter": [["outdoor", "Water filter (hollow fibre)", "Wasserfilter (Hohlfaser)"], ["pharm", "Water disinfection tablets", "Tabletten zur Wasserentkeimung"]],
    "h-store": [["hard", `Food-grade water canisters, 10–20 L, for ${water} L`, `Lebensmittelechte Wasserkanister, 10–20 L, für ${water} L`], ["home", `Fill the canisters with tap water (${water} L), label with the date`, `Kanister mit Leitungswasser füllen (${water} L), mit Datum beschriften`]],
    "h-cans": [["hard", "2 empty canisters for fetching water", "2 leere Kanister zum Wasserholen"], ["call", "Find the nearest emergency well (town website or town hall)", "Den nächsten Notbrunnen herausfinden (Website oder Rathaus der Gemeinde)"]],
    "h-floor": [["home", "Note: fill bathtub, pots and bottles at the first minute", "Merken: in der ersten Minute Badewanne, Töpfe und Flaschen füllen"]],
    "t-kit": [["hard", "Bucket with lid", "Eimer mit Deckel"], ["super", "Strong bin bags and 10 L cat litter", "Feste Müllbeutel und 10 L Katzenstreu"]],
    "t-hyg": [["drug", "Soap, wet wipes, hand disinfectant for 4 weeks", "Seife, Feuchttücher, Handdesinfektion für 4 Wochen"]],
    "f-stock": [["super", `Oats ${kg(4)} kg · rice or pasta ${kg(3)} kg · lentils ${kg(2)} kg · oil ${kg(1)} L · nuts or peanut butter ${kg(1)} kg · salt, sugar or honey`, `Haferflocken ${kg(4)} kg · Reis oder Nudeln ${kg(3)} kg · Linsen ${kg(2)} kg · Öl ${kg(1)} L · Nüsse oder Erdnussbutter ${kg(1)} kg · Salz, Zucker oder Honig`]],
    "f-stove": [["outdoor", "Camping stove and about 10 gas cartridges, or a rocket stove for outdoors", "Campingkocher und etwa 10 Gaskartuschen, oder ein Raketenofen für draußen"]],
    "f-vit": [["super", "Tinned fruit, juice, sauerkraut", "Obstkonserven, Saft, Sauerkraut"]],
    "l-lamp": [["hard", `Headlamps: ${P}, plus spare batteries`, `Stirnlampen: ${P}, dazu Ersatzbatterien`]],
    "l-radio": [["elec", "Crank or battery radio", "Kurbel- oder Batterieradio"]],
    "l-bank": [["elec", "Power bank 20,000 mAh", "Powerbank 20.000 mAh"]],
    "l-solar": [["elec", "Small foldable solar panel for power banks", "Kleines faltbares Solarpanel für Powerbanks"]],
    "g-co": [["hard", "Battery CO alarm (EN 50291)", "CO-Melder mit Batterie (EN 50291)"]],
    "g-fire": [["hard", "Fire blanket or 6 L foam extinguisher", "Löschdecke oder 6-L-Schaumlöscher"]],
    "g-cash": [["bank", `Cash in small notes: at least €${100 * P}`, `Bargeld in kleinen Scheinen: mindestens ${100 * P} €`]],
    "m-kit": [["pharm", "First-aid kit (a car kit is a good start)", "Verbandkasten (ein Kfz-Verbandkasten reicht für den Anfang)"], ["call", "Book a first-aid course", "Erste-Hilfe-Kurs buchen"]],
    "m-course": [["call", "Book a first-aid course", "Erste-Hilfe-Kurs buchen"]],
    "m-meds": [["call", "Doctor: how to keep a 4-week reserve of your medicines", "Arztpraxis: wie du eine 4-Wochen-Reserve deiner Medikamente anlegst"]],
    "p-neigh": [["people", "Ring three neighbours' doorbells: names, what each can do", "Bei drei Nachbarn klingeln: Namen, wer was kann"]],
    "p-neigh2": [["people", "Meet one or two more neighbours; agree a meeting place and time", "Ein, zwei Nachbarn mehr kennenlernen; Treffpunkt und Uhrzeit vereinbaren"]],
    "p-refuge": [["people", "Agree who you would take in, or where you would go", "Absprechen, wen ihr aufnehmt oder wohin ihr geht"]],
    "s-fam": [["people", "Without phones: how to reach family and friends; who nearby is in the fire brigade or Red Cross", "Ohne Handy: wie ihr Familie und Freunde erreicht; wer in der Nähe bei Feuerwehr oder Rotem Kreuz ist"]],
    "s-meet": [["home", "Look up your town's emergency point and write it on the card", "Den Notfall-Treffpunkt der Gemeinde nachschlagen und auf die Karte schreiben"]],
    "b-mind": [["super", "Cards or a board game", "Karten oder ein Brettspiel"]],
    "k-tools": [["hard", "Small toolbox", "Kleiner Werkzeugkasten"], ["home", "Find the main water valve, fuse box and gas valve", "Hauptwasserhahn, Sicherungskasten und Gashahn suchen"]],
    "c-city": [["people", "Ask family or friends in the countryside: could you come, and when would you go?", "Familie oder Freunde auf dem Land fragen: könntet ihr kommen, und wann würdet ihr fahren?"]]
  };
  const by = {};
  for (const l of links) for (const [st, en, de] of (M[l.id] || [])) (by[st] = by[st] || []).push({ id: l.id, s: l.s, en, de });
  return STORE_ORDER.filter(k => by[k]).map(k => ({ id: k, store: STORES[k], items: by[k] }));
}
// Typical opening hours in Germany, to say "probably open now". Holidays not included.
function openNow(st, d) {
  if (!st.h) return null;
  const day = d.getDay(), hr = d.getHours() + d.getMinutes() / 60;
  if (st.h[0][0] === 0) return true;
  if (day === 0) return false;
  if (st.workdays && day === 6) return false;
  const [o, c] = day === 6 && st.sat ? [st.h[0][0], st.sat] : st.h[0];
  return hr >= o && hr < c;
}
