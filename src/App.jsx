import { useEffect, useState } from "react";

export default function App() {
  const [dados, setDados] = useState([]);

  const URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-...output=csv";

  useEffect(() => {
    fetch(URL)
      .then((res) => res.text())
      .then((csv) => {
        const linhas = csv.split("\n").slice(1);
        const resultado = linhas.map((linha) => {
          const col = linha.split(",");
          return {
            empresa: col[0],
            tipo: col[1],
            data: col[2],
            descricao: col[3],
            categoria: col[4],
            valor: parseFloat(col[5]),
            status: col[6],
          };
        });
        setDados(resultado);
      });
  }, []);

  const totalEntradas = dados
    .filter((d) => d.tipo === "entrada")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const totalSaidas = dados
    .filter((d) => d.tipo === "saida")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const saldo = totalEntradas - totalSaidas;

  return (
    <div style={{ padding: 30, color: "#fff", background: "#0f172a" }}>
      <h1>GPSBI - Fluxo de Caixa</h1>

      <h2>Entradas: R$ {totalEntradas.toLocaleString()}</h2>
      <h2>Saídas: R$ {totalSaidas.toLocaleString()}</h2>
      <h2>Saldo: R$ {saldo.toLocaleString()}</h2>

      <hr />

      <table border="1" cellPadding="5">
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
              <td>{d.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
