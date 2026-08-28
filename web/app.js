const USE_MOCK = true;
const API = "http://localhost:8000";

const ROUTES = {
  q1: "/agg/prix-m2-commune?limit=10&min_ventes=30",
  q2: "/agg/evolution-mensuelle",
  q3: "/agg/dans-rayon?lon=3.8767&lat=43.6108&rayon_m=5000",
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

charge("q3")
  .then((d) => {
    const carte = L.map("carte").setView([43.6108, 3.8767], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(carte);
    d.forEach((m) =>
      L.circleMarker([m.lat, m.lon], { radius: 4, color: "#0b6560", fillOpacity: 0.6 })
        .addTo(carte)
        .bindPopup(`${m.nom_commune}<br>${m.prix_m2.toLocaleString("fr-FR")} €/m²<br>${m.distance_m} m`)
    );
  })
  .catch((e) => erreur("q3err", e));
