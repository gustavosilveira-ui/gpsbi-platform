export default async function handler(req, res) {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTsj89x1ZL_Cyx-UsXMxxg-p9eSiioVzvGA4Kh0zVq6Umg2sgjma1eGXsxSe8zf--JyNkOFJOFNzyy/pub?gid=706534493&single=true&output=csv";

  try {
    const response = await fetch(url);
    const csv = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao buscar CSV",
      details: String(error),
    });
  }
}
