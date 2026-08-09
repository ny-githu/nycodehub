export type LangKey =
  | "html" | "javascript" | "typescript" | "python" | "c" | "cpp" | "java" | "csharp"
  | "go" | "rust" | "php" | "ruby" | "kotlin" | "swift" | "bash" | "sql"
  | "lua" | "dart" | "r" | "perl" | "scala";

export type RunMode = "web" | "pyodide" | "remote";

export type LangDef = {
  key: LangKey;
  label: string;
  monaco: string;
  file: string;
  mode: RunMode;
  color: string;
  sample: string;
};

export const LANGS: LangDef[] = [
  {
    key: "html", label: "HTML / CSS / JS", monaco: "html", file: "index.html", mode: "web",
    color: "from-orange-500/30 to-orange-500/5",
    sample: `<!DOCTYPE html>\n<html lang="rw">\n<head>\n  <meta charset="UTF-8" />\n  <title>NYCODEHUB</title>\n</head>\n<body>\n  <h1>Muraho NYCODEHUB</h1>\n  <button onclick="alert('Bigenze neza!')">Kanda hano</button>\n</body>\n</html>`,
  },
  { key: "javascript", label: "JavaScript", monaco: "javascript", file: "app.js", mode: "web", color: "from-yellow-500/30 to-yellow-500/5", sample: `console.log("Muraho NYCODEHUB");\nfor (let i = 1; i <= 5; i++) console.log(i, i * i);` },
  { key: "python", label: "Python", monaco: "python", file: "main.py", mode: "pyodide", color: "from-blue-500/30 to-blue-500/5", sample: `print("Muraho NYCODEHUB")\nfor i in range(1, 6):\n    print(i, i * i)` },
  { key: "typescript", label: "TypeScript", monaco: "typescript", file: "index.ts", mode: "remote", color: "from-sky-500/30 to-sky-500/5", sample: `const greet = (name: string): string => \`Muraho \${name}\`;\nconsole.log(greet("NYCODEHUB"));` },
  { key: "java", label: "Java", monaco: "java", file: "Main.java", mode: "remote", color: "from-red-500/30 to-red-500/5", sample: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Muraho NYCODEHUB!");\n  }\n}` },
  { key: "c", label: "C", monaco: "c", file: "main.c", mode: "remote", color: "from-indigo-500/30 to-indigo-500/5", sample: `#include <stdio.h>\nint main(){ printf("Muraho NYCODEHUB!\\n"); return 0; }` },
  { key: "cpp", label: "C++", monaco: "cpp", file: "main.cpp", mode: "remote", color: "from-indigo-500/30 to-indigo-500/5", sample: `#include <iostream>\nint main(){ std::cout << "Muraho NYCODEHUB!\\n"; }` },
  { key: "csharp", label: "C#", monaco: "csharp", file: "Program.cs", mode: "remote", color: "from-violet-500/30 to-violet-500/5", sample: `using System;\nclass Program { static void Main(){ Console.WriteLine("Muraho NYCODEHUB!"); } }` },
  { key: "go", label: "Go", monaco: "go", file: "main.go", mode: "remote", color: "from-cyan-500/30 to-cyan-500/5", sample: `package main\nimport "fmt"\nfunc main(){ fmt.Println("Muraho NYCODEHUB!") }` },
  { key: "rust", label: "Rust", monaco: "rust", file: "main.rs", mode: "remote", color: "from-amber-600/30 to-amber-600/5", sample: `fn main(){ println!("Muraho NYCODEHUB!"); }` },
  { key: "php", label: "PHP", monaco: "php", file: "index.php", mode: "remote", color: "from-purple-500/30 to-purple-500/5", sample: `<?php\necho "Muraho NYCODEHUB!\\n";` },
  { key: "ruby", label: "Ruby", monaco: "ruby", file: "main.rb", mode: "remote", color: "from-rose-500/30 to-rose-500/5", sample: `puts "Muraho NYCODEHUB!"` },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin", file: "Main.kt", mode: "remote", color: "from-fuchsia-500/30 to-fuchsia-500/5", sample: `fun main(){ println("Muraho NYCODEHUB!") }` },
  { key: "swift", label: "Swift", monaco: "swift", file: "main.swift", mode: "remote", color: "from-orange-600/30 to-orange-600/5", sample: `print("Muraho NYCODEHUB!")` },
  { key: "bash", label: "Bash / Linux", monaco: "shell", file: "main.sh", mode: "remote", color: "from-slate-400/30 to-slate-400/5", sample: `echo "Muraho NYCODEHUB!"\nfor i in 1 2 3; do echo "i=$i"; done` },
  { key: "sql", label: "SQL", monaco: "sql", file: "query.sql", mode: "remote", color: "from-emerald-500/30 to-emerald-500/5", sample: `CREATE TABLE abanyeshuri(id INTEGER, izina TEXT);\nINSERT INTO abanyeshuri VALUES (1,'Keza'),(2,'Manzi');\nSELECT * FROM abanyeshuri;` },
  { key: "lua", label: "Lua", monaco: "lua", file: "main.lua", mode: "remote", color: "from-blue-700/30 to-blue-700/5", sample: `print("Muraho NYCODEHUB!")` },
  { key: "dart", label: "Dart", monaco: "dart", file: "main.dart", mode: "remote", color: "from-teal-500/30 to-teal-500/5", sample: `void main(){ print("Muraho NYCODEHUB!"); }` },
  { key: "r", label: "R", monaco: "r", file: "main.r", mode: "remote", color: "from-sky-600/30 to-sky-600/5", sample: `cat("Muraho NYCODEHUB!\\n")` },
  { key: "perl", label: "Perl", monaco: "perl", file: "main.pl", mode: "remote", color: "from-lime-600/30 to-lime-600/5", sample: `print "Muraho NYCODEHUB!\\n";` },
  { key: "scala", label: "Scala", monaco: "scala", file: "Main.scala", mode: "remote", color: "from-red-600/30 to-red-600/5", sample: `object Main extends App { println("Muraho NYCODEHUB!") }` },
];

export const getLang = (key: string): LangDef => LANGS.find((l) => l.key === key) ?? LANGS[0];

export type ProjectFile = { name: string; content: string };
export type Template = { id: string; lang: LangKey; title: string; desc: string; files: ProjectFile[] };

export const TEMPLATES: Template[] = [
  {
    id: "web-portfolio", lang: "html", title: "Urubuga rwawe bwite", desc: "Page igaragaza amazina, amafoto n'aho bakugeraho — HTML + CSS + JS hamwe.",
    files: [
      { name: "index.html", content: `<!DOCTYPE html>\n<html lang="rw">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>Portfolio yanjye</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <header>\n    <h1>Keza Manzi</h1>\n    <p>Umukoresha wa porogaramu — Kigali, Rwanda</p>\n  </header>\n  <main>\n    <section>\n      <h2>Imishinga yanjye</h2>\n      <ul id="projects"></ul>\n    </section>\n    <button id="hello">Nyandikira</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>` },
      { name: "styles.css", content: `body{font-family:system-ui;margin:0;background:#0f0f1a;color:#eee}\nheader{padding:48px 24px;background:linear-gradient(135deg,#4c1d95,#1e3a8a)}\nh1{margin:0;font-size:38px}\nmain{padding:24px}\nli{padding:8px 0;border-bottom:1px solid #333}\nbutton{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#7048e8;color:#fff;cursor:pointer}` },
      { name: "app.js", content: `const projects = ["Calculator", "Quiz app", "Portfolio"];\nconst list = document.getElementById("projects");\nprojects.forEach(p => {\n  const li = document.createElement("li");\n  li.textContent = p;\n  list.appendChild(li);\n});\ndocument.getElementById("hello").onclick = () => alert("Murakoze gusura!");` },
    ],
  },
  {
    id: "web-calculator", lang: "html", title: "Calculator", desc: "Imibare y'ibanze ukoresheje buttons na JavaScript.",
    files: [
      { name: "index.html", content: `<!DOCTYPE html>\n<html lang="rw">\n<head><meta charset="UTF-8" /><title>Calculator</title><link rel="stylesheet" href="styles.css" /></head>\n<body>\n  <div class="calc">\n    <input id="screen" readonly value="0" />\n    <div class="pad" id="pad"></div>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>` },
      { name: "styles.css", content: `body{display:grid;place-items:center;height:100vh;margin:0;background:#111;font-family:system-ui}\n.calc{background:#1c1c28;padding:16px;border-radius:14px;width:260px}\n#screen{width:100%;font-size:26px;text-align:right;padding:10px;border:0;border-radius:8px;background:#000;color:#0f0}\n.pad{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}\nbutton{padding:14px;border:0;border-radius:8px;background:#2d2d44;color:#fff;font-size:16px;cursor:pointer}` },
      { name: "app.js", content: `const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"];\nconst screen = document.getElementById("screen");\nconst pad = document.getElementById("pad");\nkeys.forEach(k => {\n  const b = document.createElement("button");\n  b.textContent = k;\n  b.onclick = () => {\n    if (k === "C") return (screen.value = "0");\n    if (k === "=") {\n      try { screen.value = String(eval(screen.value)); } catch { screen.value = "Ikosa"; }\n      return;\n    }\n    screen.value = screen.value === "0" ? k : screen.value + k;\n  };\n  pad.appendChild(b);\n});` },
    ],
  },
  {
    id: "web-quiz", lang: "html", title: "Umukino wa Quiz", desc: "Ibibazo n'amanota abarwa ako kanya.",
    files: [
      { name: "index.html", content: `<!DOCTYPE html>\n<html lang="rw"><head><meta charset="UTF-8" /><title>Quiz</title><link rel="stylesheet" href="styles.css" /></head>\n<body>\n  <h1>Quiz ya NYCODEHUB</h1>\n  <div id="quiz"></div>\n  <p id="score"></p>\n  <script src="app.js"></script>\n</body></html>` },
      { name: "styles.css", content: `body{font-family:system-ui;padding:24px;background:#0f0f1a;color:#eee}\n.q{margin-bottom:18px;padding:14px;border:1px solid #333;border-radius:10px}\nbutton{margin:4px;padding:8px 12px;border:0;border-radius:6px;background:#3730a3;color:#fff;cursor:pointer}` },
      { name: "app.js", content: `const questions = [\n  { q: "HTML ikoreshwa iki?", a: ["Imiterere ya page", "Kubara"], ok: 0 },\n  { q: "CSS ikora iki?", a: ["Isura", "Database"], ok: 0 },\n];\nlet score = 0;\nconst box = document.getElementById("quiz");\nquestions.forEach((item, i) => {\n  const div = document.createElement("div");\n  div.className = "q";\n  div.innerHTML = "<p>" + item.q + "</p>";\n  item.a.forEach((choice, j) => {\n    const b = document.createElement("button");\n    b.textContent = choice;\n    b.onclick = () => {\n      if (j === item.ok) score++;\n      document.getElementById("score").textContent = "Amanota: " + score + "/" + questions.length;\n    };\n    div.appendChild(b);\n  });\n  box.appendChild(div);\n});` },
    ],
  },
  {
    id: "js-todo", lang: "javascript", title: "To-do list (console)", desc: "Ongeraho no gusiba imirimo ukoresheje array na functions.",
    files: [{ name: "app.js", content: `const todos = [];\nfunction add(task){ todos.push({ task, done: false }); }\nfunction complete(i){ if (todos[i]) todos[i].done = true; }\nfunction show(){ todos.forEach((t, i) => console.log(i, t.done ? "[x]" : "[ ]", t.task)); }\n\nadd("Kwiga JavaScript");\nadd("Gukora umushinga");\ncomplete(0);\nshow();` }],
  },
  {
    id: "js-snake", lang: "html", title: "Umukino wa Snake", desc: "Canvas, keyboard events n'amanota.",
    files: [
      { name: "index.html", content: `<!DOCTYPE html>\n<html lang="rw"><head><meta charset="UTF-8" /><title>Snake</title><link rel="stylesheet" href="styles.css" /></head>\n<body><canvas id="c" width="300" height="300"></canvas><p id="s">Amanota: 0</p><script src="app.js"></script></body></html>` },
      { name: "styles.css", content: `body{display:grid;place-items:center;background:#0b0b12;color:#eee;font-family:system-ui;height:100vh;margin:0}\ncanvas{background:#000;border:2px solid #7048e8;border-radius:8px}` },
      { name: "app.js", content: `const ctx = document.getElementById("c").getContext("2d");\nlet snake = [{x:5,y:5}], dir = {x:1,y:0}, food = {x:10,y:10}, score = 0;\ndocument.onkeydown = (e) => {\n  if (e.key === "ArrowUp") dir = {x:0,y:-1};\n  if (e.key === "ArrowDown") dir = {x:0,y:1};\n  if (e.key === "ArrowLeft") dir = {x:-1,y:0};\n  if (e.key === "ArrowRight") dir = {x:1,y:0};\n};\nsetInterval(() => {\n  const head = { x: (snake[0].x + dir.x + 20) % 20, y: (snake[0].y + dir.y + 20) % 20 };\n  snake.unshift(head);\n  if (head.x === food.x && head.y === food.y) {\n    score++;\n    document.getElementById("s").textContent = "Amanota: " + score;\n    food = { x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20) };\n  } else snake.pop();\n  ctx.clearRect(0,0,300,300);\n  ctx.fillStyle = "#f43f5e"; ctx.fillRect(food.x*15, food.y*15, 14, 14);\n  ctx.fillStyle = "#22c55e"; snake.forEach(p => ctx.fillRect(p.x*15, p.y*15, 14, 14));\n}, 130);` },
    ],
  },
  {
    id: "py-guess", lang: "python", title: "Umukino Guess Number", desc: "Ukina n'umubare uhishe ukoresheje random.",
    files: [{ name: "main.py", content: `import random\n\nsecret = random.randint(1, 20)\nfor attempt in range(1, 6):\n    guess = random.randint(1, 20)\n    print(f"Igerageza {attempt}: {guess}")\n    if guess == secret:\n        print("Wabonye umubare!", secret)\n        break\n    print("Hejuru" if guess < secret else "Hasi")\nelse:\n    print("Umubare wari", secret)` }],
  },
  {
    id: "py-data", lang: "python", title: "Gusesengura amakuru", desc: "Bara impuzandengo, ikigero cyo hejuru n'icyo hasi.",
    files: [{ name: "main.py", content: `amanota = [78, 92, 55, 64, 88, 71]\n\nprint("Umubare w'abanyeshuri:", len(amanota))\nprint("Impuzandengo:", sum(amanota) / len(amanota))\nprint("Hejuru:", max(amanota))\nprint("Hasi:", min(amanota))\n\nfor i, n in enumerate(sorted(amanota, reverse=True), start=1):\n    print(i, n, "TSINDIYE" if n >= 60 else "TSINZWE")` }],
  },
  {
    id: "java-bank", lang: "java", title: "Banki yoroshye", desc: "Konti, kubitsa no kubikuza ukoresheje classes.",
    files: [{ name: "Main.java", content: `class Konti {\n  private String nyirayo;\n  private double amafaranga;\n\n  Konti(String nyirayo, double amafaranga) {\n    this.nyirayo = nyirayo;\n    this.amafaranga = amafaranga;\n  }\n\n  void bitsa(double n) { amafaranga += n; }\n\n  boolean bikuza(double n) {\n    if (n > amafaranga) return false;\n    amafaranga -= n;\n    return true;\n  }\n\n  void erekana() { System.out.println(nyirayo + ": " + amafaranga + " RWF"); }\n}\n\npublic class Main {\n  public static void main(String[] args) {\n    Konti k = new Konti("Keza", 5000);\n    k.bitsa(2500);\n    System.out.println(k.bikuza(10000) ? "Byakunze" : "Amafaranga ntahagije");\n    k.erekana();\n  }\n}` }],
  },
  {
    id: "c-algos", lang: "c", title: "Algorithms", desc: "Sorting na searching mu ruhererekane.",
    files: [{ name: "main.c", content: `#include <stdio.h>\n\nvoid bubble(int a[], int n) {\n  for (int i = 0; i < n - 1; i++)\n    for (int j = 0; j < n - i - 1; j++)\n      if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }\n}\n\nint search(int a[], int n, int target) {\n  for (int i = 0; i < n; i++) if (a[i] == target) return i;\n  return -1;\n}\n\nint main() {\n  int a[] = {9, 3, 7, 1, 5};\n  int n = 5;\n  bubble(a, n);\n  for (int i = 0; i < n; i++) printf("%d ", a[i]);\n  printf("\\nAho 7 iri: %d\\n", search(a, n, 7));\n  return 0;\n}` }],
  },
  {
    id: "sql-school", lang: "sql", title: "Database y'ishuri", desc: "Tables, joins na queries z'amanota.",
    files: [{ name: "query.sql", content: `CREATE TABLE abanyeshuri (id INTEGER, izina TEXT);\nCREATE TABLE amanota (id INTEGER, isomo TEXT, inota INTEGER);\n\nINSERT INTO abanyeshuri VALUES (1,'Keza'), (2,'Manzi'), (3,'Iranzi');\nINSERT INTO amanota VALUES (1,'Math',85), (1,'IT',92), (2,'Math',54), (3,'IT',77);\n\nSELECT a.izina, AVG(m.inota) AS impuzandengo\nFROM abanyeshuri a\nJOIN amanota m ON m.id = a.id\nGROUP BY a.izina\nORDER BY impuzandengo DESC;` }],
  },
  {
    id: "bash-backup", lang: "bash", title: "Backup script", desc: "Bika amadosiye ukoresheje loops na conditions.",
    files: [{ name: "main.sh", content: `#!/bin/bash\nIBIRIMO="dosiye1.txt dosiye2.txt"\nAHO="backup"\nmkdir -p "$AHO"\nfor f in $IBIRIMO; do\n  echo "Ibirimo bya $f" > "$f"\n  cp "$f" "$AHO/"\n  echo "Byabitswe: $AHO/$f"\ndone\nls -l "$AHO"` }],
  },
  {
    id: "ts-store", lang: "typescript", title: "Sisitemu y'ibaruramari", desc: "Types zikomeye ku bicuruzwa n'ubwishyu.",
    files: [{ name: "index.ts", content: `type Igicuruzwa = { izina: string; igiciro: number; umubare: number };\n\nconst ububiko: Igicuruzwa[] = [\n  { izina: "Laptop", igiciro: 450000, umubare: 2 },\n  { izina: "Mouse", igiciro: 12000, umubare: 5 },\n];\n\nconst igiteranyo = (list: Igicuruzwa[]): number =>\n  list.reduce((sum, i) => sum + i.igiciro * i.umubare, 0);\n\nububiko.forEach((i) => console.log(i.izina, i.igiciro * i.umubare, "RWF"));\nconsole.log("Byose:", igiteranyo(ububiko), "RWF");` }],
  },
  {
    id: "go-api", lang: "go", title: "Structs na maps", desc: "Kubara amanota ukoresheje structs muri Go.",
    files: [{ name: "main.go", content: `package main\n\nimport "fmt"\n\ntype Umunyeshuri struct {\n\tIzina string\n\tInota int\n}\n\nfunc main() {\n\tlist := []Umunyeshuri{{"Keza", 88}, {"Manzi", 61}, {"Iranzi", 45}}\n\ttotal := 0\n\tfor _, u := range list {\n\t\tstatus := "TSINDIYE"\n\t\tif u.Inota < 60 {\n\t\t\tstatus = "TSINZWE"\n\t\t}\n\t\tfmt.Println(u.Izina, u.Inota, status)\n\t\ttotal += u.Inota\n\t}\n\tfmt.Println("Impuzandengo:", total/len(list))\n}` }],
  },
];

export const templatesFor = (lang: string) => TEMPLATES.filter((t) => t.lang === lang);
export const TEMPLATE_HANDOFF_KEY = "nycodehub:template";

const EXT_LANG: Record<string, LangKey> = {
  html: "html", htm: "html", css: "html", js: "html", mjs: "html", cjs: "html", jsx: "html",
  ts: "typescript", tsx: "typescript",
  py: "python", java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp", go: "go", rs: "rust", php: "php", rb: "ruby", kt: "kotlin", swift: "swift",
  sh: "bash", sql: "sql", lua: "lua", dart: "dart", r: "r", pl: "perl", scala: "scala",
};

/** Decides the language from the file itself, so the user never has to pick one. */
export function langFromFile(name: string): LangKey | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? null;
}
