import { useEffect, useState } from "react";

export default function App() {
  const [dados, setDados] = useState([]);

const URL = "/api/fluxo";
  
  useEffect(() => {
    fetch(URL)
      .then((res) => res.text())
      .then((csv) => {
        const linhas = csv.split("\n").slice(1);

        const resultado = linhas
          .map((linha) => {
            const limpa = linha.replaceAll('"', "").trim();

            if (!limpa) return null;

            const col = limpa.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            return {
              empresa: (col[0] || "").trim(),
              tipo: (col[1] || "").toLowerCase().trim(),
              data: (col[2] || "").trim(),
              descricao: (col[3] || "").trim(),
              categoria: (col[4] || "").trim(),
              valor:
                parseFloat(
                  (col[5] || "0")
                    .replace(/\./g, "")
                    .replace(",", ".")
                    .trim()
                ) || 0,
              status: (col[6] || "").trim(),
            };
          })
          .filter(Boolean);

        console.log(resultado);
        setDados(resultado);
      })
      .catch((erro) => {
        console.error("Erro ao carregar CSV:", erro);
      });
  }, []);

  const totalEntradas = dados
    .filter((d) => d.tipo === "entrada")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const totalSaidas = dados
    .filter((d) => d.tipo === "saida" || d.tipo === "saída")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const saldo = totalEntradas - totalSaidas;

  return (
    <div style={{ padding: 30, color: "#fff", background: "#0f172a", minHeight: "100vh" }}>
      <h1>GPSBI - Fluxo de Caixa</h1>

      <h2>Entradas: R$ {totalEntradas.toLocaleString("pt-BR")}</h2>
      <h2>Saídas: R$ {totalSaidas.toLocaleString("pt-BR")}</h2>
      <h2>Saldo: R$ {saldo.toLocaleString("pt-BR")}</h2>

      <hr />

      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", background: "#111827" }}>
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i}>
              <td>{d.empresa}</td>
              <td>{d.tipo}</td>
              <td>{d.data}</td>
              <td>{d.descricao}</td>
              <td>{d.valor.toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
