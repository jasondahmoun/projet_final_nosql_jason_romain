const USE_MOCK = false;
const API = "http://localhost:8000";

const ROUTES = {
  q1: "/agg/prix-m2-commune?limit=10&min_ventes=30",
  q2: "/agg/evolution-mensuelle",
  q3: "/agg/dans-rayon?lon=3.8767&lat=43.6108&rayon_m=5000&limit=4000",
};

const charge = (q) =>
  fetch(USE_MOCK ? `mock/${q}.json` : API + ROUTES[q]).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });

const erreur = (id, e) => {
  document.getElementById(id).innerHTML = `<p class="err">${e.message}</p>`;
};

charge("q1")
  .then((d) => {
    document.getElementById("q1").innerHTML =
      "<table><thead><tr><th>Commune</th><th>Prix médian €/m²</th><th>Ventes</th></tr></thead><tbody>" +
      d.map((r) => `<tr><td>${r.commune}</td><td>${r.median_m2.toLocaleString("fr-FR")}</td><td>${r.n}</td></tr>`).join("") +
      "</tbody></table>";
  })
  .catch((e) => erreur("q1", e));

charge("q2")
  .then((d) => {
    const mois = [...new Set(d.map((r) => r.mois))].sort();
    const serie = (t) => mois.map((m) => (d.find((r) => r.mois === m && r.type === t) || {}).prix_m2_moyen ?? null);
    new Chart(document.getElementById("q2"), {
      type: "line",
      data: {
        labels: mois,
        datasets: [
          { label: "Appartement", data: serie("Appartement"), borderColor: "#0b6560", tension: 0.25 },
          { label: "Maison", data: serie("Maison"), borderColor: "#8a3d74", tension: 0.25 },
        ],
      },
      options: { responsive: true, scales: { y: { title: { display: true, text: "€/m²" } } } },
    });
  })
  .catch((e) => erreur("q2err", e));

const PALIERS = [
  { max: 2500, couleur: "#2c7bb6", label: "< 2 500" },
  { max: 3000, couleur: "#abd9e9", label: "2 500 – 3 000" },
  { max: 3500, couleur: "#ffffbf", label: "3 000 – 3 500" },
  { max: 4500, couleur: "#fdae61", label: "3 500 – 4 500" },
  { max: Infinity, couleur: "#d7191c", label: "> 4 500" },
];

const couleurPrix = (p) => PALIERS.find((x) => p < x.max).couleur;

charge("q3")
  .then((d) => {
    const carte = L.map("carte").setView([43.6108, 3.8767], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      opacity: 0.55,
    }).addTo(carte);

    d.forEach((m) =>
      L.circleMarker([m.lat, m.lon], {
        radius: 3,
        stroke: false,
        fillColor: couleurPrix(m.prix_m2),
        fillOpacity: 0.75,
      })
        .addTo(carte)
        .bindPopup(`${m.nom_commune}<br>${m.prix_m2.toLocaleString("fr-FR")} €/m²<br>à ${m.distance_m} m du centre`)
    );

    const legende = L.control({ position: "bottomright" });
    legende.onAdd = () => {
      const div = L.DomUtil.create("div", "legende");
      div.innerHTML =
        "<strong>€/m²</strong>" +
        PALIERS.map((p) => `<span><i style="background:${p.couleur}"></i>${p.label}</span>`).join("");
      return div;
    };
    legende.addTo(carte);

    document.getElementById("q3count").textContent = `${d.length.toLocaleString("fr-FR")} appartements vendus`;
  })
  .catch((e) => erreur("q3err", e));
