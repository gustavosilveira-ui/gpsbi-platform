import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function App() {
  const [dados, setDados] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("todas");

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

        setDados(resultado);
      })
      .catch((erro) => {
        console.error("Erro ao carregar CSV:", erro);
      });
  }, []);

  const dadosFiltrados =
    empresaSelecionada === "todas"
      ? dados
      : dados.filter(
          (d) =>
            (d.empresa || "").toLowerCase().trim() ===
            empresaSelecionada.toLowerCase().trim()
        );

  const totalEntradas = dadosFiltrados
    .filter((d) => d.tipo === "entrada")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const totalSaidas = dadosFiltrados
    .filter((d) => d.tipo === "saida" || d.tipo === "saída")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const saldo = totalEntradas - totalSaidas;

  const dadosPorData = useMemo(() => {
    const mapa = {};

    dadosFiltrados.forEach((item) => {
      const data = item.data || "Sem data";

      if (!mapa[data]) {
        mapa[data] = {
          data,
          entradas: 0,
          saidas: 0,
        };
      }

      if (item.tipo === "entrada") {
        mapa[data].entradas += item.valor || 0;
      }

      if (item.tipo === "saida" || item.tipo === "saída") {
        mapa[data].saidas += item.valor || 0;
      }
    });

    return Object.values(mapa).sort((a, b) => a.data.localeCompare(b.data));
  }, [dadosFiltrados]);

  const dadosSaldoAcumulado = useMemo(() => {
    let acumulado = 0;

    return dadosPorData.map((item) => {
      acumulado += item.entradas - item.saidas;

      return {
        ...item,
        saldoAcumulado: acumulado,
      };
    });
  }, [dadosPorData]);

  const formatCurrency = (valor) =>
    valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #081120 0%, #0b1730 100%)",
        color: "#ffffff",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "42px" }}>GPSBI - Fluxo de Caixa</h1>
            <p style={{ marginTop: "8px", color: "#94a3b8" }}>
              Visão financeira online com dados reais
            </p>
          </div>

          <select
            value={empresaSelecionada}
            onChange={(e) => setEmpresaSelecionada(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              minWidth: "220px",
            }}
          >
            <option value="todas">Todas as empresas</option>
            <option value="greener">Greener</option>
            <option value="greendex">Greendex</option>
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <CardTitulo
            titulo="Entradas"
            valor={formatCurrency(totalEntradas)}
            cor="#22c55e"
          />
          <CardTitulo
            titulo="Saídas"
            valor={formatCurrency(totalSaidas)}
            cor="#ef4444"
          />
          <CardTitulo
            titulo="Saldo"
            valor={formatCurrency(saldo)}
            cor={saldo >= 0 ? "#38bdf8" : "#f59e0b"}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "18px",
              padding: "20px",
              minHeight: "380px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              Entradas x Saídas por Data
            </h3>

            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer>
                <BarChart data={dadosPorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="data" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: "#0b1220",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#22c55e" name="Entradas" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "18px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Resumo</h3>

            <div style={{ color: "#94a3b8", lineHeight: "1.9" }}>
              <div>
                <strong style={{ color: "#fff" }}>Empresa:</strong>{" "}
                {empresaSelecionada === "todas"
                  ? "Todas"
                  : empresaSelecionada.charAt(0).toUpperCase() +
                    empresaSelecionada.slice(1)}
              </div>
              <div>
                <strong style={{ color: "#fff" }}>Registros:</strong>{" "}
                {dadosFiltrados.length}
              </div>
              <div>
                <strong style={{ color: "#fff" }}>Datas com movimento:</strong>{" "}
                {dadosPorData.length}
              </div>
              <div>
                <strong style={{ color: "#fff" }}>Saldo final:</strong>{" "}
                {formatCurrency(saldo)}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Saldo Acumulado</h3>

          <div style={{ width: "100%", height: "320px" }}>
            <ResponsiveContainer>
              <LineChart data={dadosSaldoAcumulado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="data" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "#0b1220",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saldoAcumulado"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={false}
                  name="Saldo acumulado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "18px",
            padding: "20px",
            overflowX: "auto",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Lançamentos</h3>

          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: "900px",
            }}
          >
            <thead>
              <tr style={{ background: "#111827" }}>
                <th style={thStyle}>Empresa</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Descrição</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((d, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{d.empresa}</td>
                  <td style={tdStyle}>{d.tipo}</td>
                  <td style={tdStyle}>{d.data}</td>
                  <td style={tdStyle}>{d.descricao}</td>
                  <td style={tdStyle}>{d.categoria}</td>
                  <td style={tdStyle}>{formatCurrency(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CardTitulo({ titulo, valor, cor }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "18px",
        padding: "20px",
      }}
    >
      <div style={{ color: "#94a3b8", marginBottom: "10px", fontSize: "14px" }}>
        {titulo}
      </div>
      <div style={{ fontSize: "34px", fontWeight: "bold", color: cor }}>
        {valor}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "1px solid #334155",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #1e293b",
};
