const statsContainer = document.getElementById("statsContainer");
const daySelector = document.getElementById("daySelector");
const heroListContainer = document.getElementById("heroListContainer");
let currentDay = 1;
let heroListById = {};

// ----------------- Skeleton Loader -----------------
function showSkeletons() {
  statsContainer.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    statsContainer.innerHTML += `
      <div class="w-36 flex-shrink-0 bg-gray-800 rounded-md p-2 animate-pulse">
        <div class="h-32 bg-gray-700 rounded mb-2"></div>
        <div class="h-4 bg-gray-700 rounded w-3/4 mb-1"></div>
        <div class="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    `;
  }
}

// ----------------- Hero Stats Fetch -----------------
function fetchAndRender(day = 1) {
  showSkeletons();
  fetch(`https://mlbb-stats.ridwaanhall.com/api/hero-rank/?days=${day}&format=json&index=2&rank=mythic&size=10&sort_field=pick_rate&sort_order=asc`)
    .then(res => res.json())
    .then(json => {
      statsContainer.innerHTML = "";
      json.data.records.forEach((record, i) => {
        const hero = record.data.main_hero.data;
        const winRate = (record.data.main_hero_win_rate * 100).toFixed(1);
        statsContainer.innerHTML += `
          <div class="w-36 flex-shrink-0 bg-gray-900 rounded-md p-2" data-aos="zoom-in">
            <div class="relative">
              <img src="${hero.head}" alt="${hero.name}" class="h-32 w-full object-cover rounded" />
              <div class="absolute top-1 left-1 bg-red-600 text-xs px-2 py-0.5 rounded-full">#${i + 1}</div>
            </div>
            <h4 class="mt-2 text-sm font-bold">${hero.name}</h4>
            <p class="text-xs text-green-400">WR: ${winRate}%</p>
          </div>
        `;
      });
      AOS.refresh();
    });
}

daySelector.addEventListener("change", (e) => {
  currentDay = parseInt(e.target.value);
  fetchAndRender(currentDay);
});

// ----------------- Role-Based Hero Fetch -----------------
const combos = [
  { role: "tank", lane: "all" },
  { role: "fighter", lane: "all" },
  { role: "ass", lane: "all" },
  { role: "mage", lane: "all" },
  { role: "mm", lane: "all" },
  { role: "supp", lane: "all" }
];

async function fetchAllHeroesPerCombo(role, lane) {
  const perPage = 50;
  let page = 1;
  let allHeroes = [];

  while (true) {
    const url = `https://mlbb-stats.ridwaanhall.com/api/hero-position/?role=${role}&lane=${lane}&size=${perPage}&index=${page}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data.records?.length) break;

    json.data.records.forEach(r => {
      const heroData = r.data.hero.data;
      allHeroes.push({
        name: heroData.name,
        image: heroData.smallmap,
      });
    });

    if (json.data.records.length < perPage) break;
    page++;
  }

  return allHeroes;
}

// ----------------- Render Heroes with Click -----------------
async function renderHeroListByRoles() {
  heroListContainer.innerHTML = "";

  for (const { role, lane } of combos) {
    const heroes = await fetchAllHeroesPerCombo(role, lane);
    if (!heroes.length) continue;

    const title = `${role.charAt(0).toUpperCase() + role.slice(1)}${lane !== "all" ? ` / ${lane}` : ""}`;

    const section = document.createElement("div");
    section.innerHTML = `
      <h3 class="text-xl font-bold mb-3">${title}</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        ${heroes.map(h => `
          <div class="bg-gray-900 rounded-md p-2 text-center hover:scale-105 transition-transform duration-200 cursor-pointer hero-card" data-name="${h.name}" data-aos="fade-up">
            <img src="${h.image}" alt="${h.name}" class="w-full h-20 object-cover rounded mb-2" />
            <p class="text-sm font-medium">${h.name}</p>
          </div>
        `).join('')}
      </div>
    `;
    heroListContainer.appendChild(section);
  }

  AOS.refresh();
  attachHeroClickEvents();
}

// ----------------- Fetch Hero List with IDs -----------------

let heroNameToId = {};

// Normalize function to avoid matching issues
const normalize = (str) => str.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

// Fetch hero ID-name list once
async function fetchHeroIdList() {
  try {
    const res = await fetch("https://mlbb-stats.ridwaanhall.com/api/hero-list/?format=json");
    heroListById = await res.json();

    // Reverse lookup for matching hero names
    Object.entries(heroListById).forEach(([id, name]) => {
      heroNameToId[normalize(name)] = id;
    });

    console.log("✅ Hero list loaded:", heroListById);
  } catch (err) {
    console.error("❌ Failed to fetch hero list", err);
  }
}

// Call this once on page load
fetchHeroIdList();
function showHeroModal(heroName) {
  const modal = document.getElementById("heroModal");
  const modalContent = document.getElementById("heroModalContent");

  console.log("🔍 Clicked Hero Name:", heroName);
  const normName = normalize(heroName);
  const matchedId = heroNameToId[normName];

  console.log("🆔 Normalized Name:", normName);
  console.log("🧠 Matched ID:", matchedId);

  if (!matchedId) {
    modalContent.innerHTML = `
      <div class="text-center text-red-400 py-4">
        Hero "<strong>${heroName}</strong>" not found in database.
      </div>
    `;
    modal.classList.remove("hidden");
    return;
  }

  modalContent.innerHTML = `<p class="text-center text-gray-400 py-4">Loading hero data...</p>`;
  modal.classList.remove("hidden");

  fetch(`https://mlbb-stats.ridwaanhall.com/api/hero-detail/${matchedId}/?format=json`)
  .then((res) => res.json())
  .then((data) => {
    const hero = data?.data?.records?.[0]?.data?.hero?.data;
const relation = data?.data?.records?.[0]?.data?.relation;

if (!hero) {
  console.error("❌ Incomplete hero data.");
  return;
}

let skillsHTML = "";
const skills = hero.heroskilllist?.[0]?.skilllist || [];
skills.forEach(skill => {
  const tags = (skill.skilltag || [])
    .map(tag => `<span style="background-color: rgb(${tag.tagrgb}); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;">${tag.tagname}</span>`)
    .join("");
  
  skillsHTML += `
    <div class="mb-4">
      <div class="flex items-center gap-2">
        <img src="${skill.skillicon}" alt="${skill.skillname}" class="w-10 h-10 rounded" />
        <h3 class="text-lg font-semibold">${skill.skillname}</h3>
      </div>
      <div class="text-sm mt-1">${skill.skilldesc}</div>
      <div class="mt-1">${tags}</div>
    </div>
  `;
});

// Function to render heroes with icons
function renderRelated(title, desc, heroes) {
  if (!heroes || heroes.length === 0 || typeof heroes[0] !== "object") return "";

  const icons = heroes.map(h => `<img src="${h?.data?.head}" class="w-10 h-10 rounded-full" />`).join("");

  return `
    <div class="mb-4">
      <h3 class="text-md font-bold">${title}</h3>
      <p class="text-sm mb-2">${desc}</p>
      <div class="flex gap-2">${icons}</div>
    </div>
  `;
}

const modalHTML = `
  <div class="p-4">
    <div class="flex gap-4 items-center mb-4">
      <img src="${hero.head}" alt="${hero.name}" class="w-20 h-20 rounded" />
      <div>
        <h2 class="text-2xl font-bold">${hero.name}</h2>
        <p class="text-sm text-gray-500">${hero.sortlabel.join(", ")} • ${hero.roadsortlabel.filter(Boolean).join(", ")}</p>
        <p class="text-sm text-gray-600">Difficulty: ${hero.difficulty}</p>
        <p class="text-sm text-gray-600">Specialty: ${hero.speciality.join(", ")}</p>
      </div>
    </div>

    <div class="mb-4">
      <h3 class="font-bold text-lg mb-1">Story</h3>
      <p class="text-sm">${hero.story || "No story provided."}</p>
    </div>

    <div class="mb-4">
      <h3 class="font-bold text-lg mb-2">Skills</h3>
      ${skillsHTML}
    </div>

    ${renderRelated("Best Partners", relation?.assist?.desc, relation?.assist?.target_hero)}
    ${renderRelated("Strong Against", relation?.strong?.desc, relation?.strong?.target_hero)}
    ${renderRelated("Weak Against", relation?.weak?.desc, relation?.weak?.target_hero)}

    <div class="mt-6">
      <a href="${data?.data?.records?.[0]?.data?.url}" target="_blank" class="text-blue-500 hover:underline">Official Lore Page →</a>
    </div>
  </div>
`;

document.getElementById("heroModalContent").innerHTML = modalHTML;
document.getElementById("heroModal").classList.remove("hidden");
 })
  .catch((err) => {
    console.error("❌ Fetch error:", err);
  });
}


// Close modal logic
document.getElementById("heroModal").addEventListener("click", (e) => {
  if (e.target.id === "heroModal") {
    e.target.classList.add("hidden");
  }
});


function closeHeroModal() {
  const modal = document.getElementById("heroModal");
  modal.querySelector("div").classList.remove("opacity-100", "scale-100");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

function attachHeroClickEvents() {
  document.querySelectorAll(".hero-card").forEach(card => {
    const name = card.getAttribute("data-name");
    card.addEventListener("click", () => showHeroModal(name));
  });
}

// ----------------- Initial Load -----------------
(async () => {
  await fetchHeroIdList();
  renderHeroListByRoles();
  fetchAndRender(currentDay);
})();
