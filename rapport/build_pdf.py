import io, subprocess, sys, os, re, struct

SC = os.path.dirname(os.path.abspath(__file__))
md = io.open("rapport/RAPPORT.md", encoding="utf-8").read()

# les images locales doivent etre embarquees : Chrome headless ne charge pas
# un file:// relatif depuis une page servie depuis un autre dossier
import base64
png = base64.b64encode(open("rapport/captures/front.png", "rb").read()).decode()
md = md.replace("(captures/front.png)", "(data:image/png;base64," + png + ")")

CSS = """
@page { size: A4; margin: 17mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font: 10.4pt/1.5 Georgia, "Times New Roman", serif; color: #16201f; margin: 0; }
h1 { font-size: 21pt; line-height: 1.12; margin: 0 0 10pt; letter-spacing: -.01em; }
h2 { font-size: 14pt; margin: 19pt 0 7pt; padding-bottom: 3pt;
     border-bottom: 1.2pt solid #16201f; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 13pt 0 4pt; page-break-after: avoid; }
h4 { font-size: 10.5pt; margin: 10pt 0 3pt; page-break-after: avoid; }
p { margin: 0 0 6pt; text-align: justify; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 7pt; padding-left: 16pt; }
li { margin-bottom: 2.5pt; orphans: 2; widows: 2; }
hr { border: 0; border-top: .6pt solid #c9d2d0; margin: 12pt 0; }
code { font: 8.7pt "SF Mono", Menlo, Consolas, monospace; background: #eef1f0;
       padding: .5pt 2.5pt; border-radius: 2pt; }
pre { background: #f4f6f5; border: .6pt solid #d5dcda; border-left: 2.2pt solid #0b6560;
      padding: 6pt 8pt; margin: 0 0 8pt; page-break-inside: avoid; overflow: hidden; }
pre code { background: none; padding: 0; font-size: 8.1pt; line-height: 1.42; }

/* le tableau doit pouvoir couler sur plusieurs pages, en repetant son en-tete :
   un page-break-inside:avoid sur un grand tableau laisse une page blanche */
table { border-collapse: collapse; width: 100%; margin: 0 0 9pt; font-size: 8.6pt;
        page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; page-break-after: auto; }
th, td { border: .6pt solid #c9d2d0; padding: 3.2pt 5pt; text-align: left; vertical-align: top; }
th { background: #e8ecea; font-weight: 700; font-size: 8.1pt; }
blockquote { margin: 0 0 8pt; padding: 5pt 9pt; background: #f2f6f5;
             border-left: 2.2pt solid #0b6560; page-break-inside: avoid; }
blockquote p { margin: 0; text-align: left; }
img { max-width: 100%; max-height: 232mm; height: auto; display: block;
      border: .6pt solid #c9d2d0; page-break-inside: avoid; margin: 0 auto; }

/* page de garde */
.garde { margin: 0 0 4pt; }
.garde p { text-align: left; margin: 0 0 2pt; font-size: 10.5pt; }
"""

HTML = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Rapport - Prix au m2 dans l'Herault</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<style>__CSS__</style></head><body><div id="doc"></div>
<script id="src" type="text/markdown">__MD__</script>
<script>
marked.setOptions({ breaks: true, gfm: true });
const doc = document.getElementById("doc");
doc.innerHTML = marked.parse(document.getElementById("src").textContent);
// le bloc d'identification qui suit le titre devient la page de garde
const h1 = doc.querySelector("h1");
if (h1 && h1.nextElementSibling && h1.nextElementSibling.tagName === "P") {
  h1.nextElementSibling.classList.add("garde");
}
</script></body></html>"""

html = HTML.replace("__CSS__", CSS).replace("__MD__", md)
out_html = os.path.join(SC, "rapport.html")
io.open(out_html, "w", encoding="utf-8").write(html)

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                "--virtual-time-budget=12000",
                "--print-to-pdf=" + os.path.abspath("rapport/RAPPORT.pdf"),
                "file://" + out_html],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

d = open("rapport/RAPPORT.pdf", "rb").read()
print("pages :", len(re.findall(rb"/Type\s*/Page[^s]", d)), " taille :", len(d)//1024, "Ko")
