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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./styles.css";

const COLORS = {
  blue: "#1eb4ff",
  blueSoft: "#12314f",
  green: "#20d1a5",
  red: "#ff5b5b",
  yellow: "#ffd166",
  teal: "#24c7b2",
  text: "#e8f0f7",
  muted: "#7f93ab",
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function App() {
  const [dados, setDados] = useState([]);
  const [logado, setLogado] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [pagina, setPagina] = useState("fluxo");
  const [empresaSelecionada, setEmpresaSelecionada] = useState("Global");
  const [anoSelecionado, setAnoSelecionado] = useState("todos");
  const [dreExpandido, setDreExpandido] = useState({
    receita: true,
    despesas: true,
  });
  const [fluxoExpandido, setFluxoExpandido] = useState({
    recebimentos: true,
    saidas: true,
  });

  useEffect(() => {
    fetch("/api/fluxo")
      .then((res) => res.text())
      .then((csv) => {
        const linhas = csv.split("\n").slice(1);

        const resultado = linhas
          .map((linha) => {
            const limpa = linha.trim();
            if (!limpa) return null;

            const col = limpa.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            const limparCampo = (valor) =>
              (valor || "").replaceAll('"', "").trim();

            const dataOriginal = limparCampo(col[2]);
            const data = parseDateSafe(dataOriginal);

            return {
              empresa: limparCampo(col[0]),
              tipo: limparCampo(col[1]).toLowerCase(),
              dataOriginal,
              data,
              descricao: limparCampo(col[3]),
              categoria: limparCampo(col[4]) || "Sem categoria",
              valor:
                parseFloat(
                  limparCampo(col[5]).replace(/\./g, "").replace(",", ".")
                ) || 0,
              status: limparCampo(col[6]),
            };
          })
          .filter(Boolean);

        setDados(resultado);
      })
      .catch((erro) => {
        console.error("Erro ao carregar CSV:", erro);
      });
  }, []);

  const anosDisponiveis = useMemo(() => {
    const anos = Array.from(
      new Set(
        dados
          .filter((d) => d.data instanceof Date && !isNaN(d.data))
          .map((d) => String(d.data.getFullYear()))
      )
    ).sort();
    return anos;
  }, [dados]);

  const dadosFiltrados = useMemo(() => {
    let base = dados;

    if (empresaSelecionada !== "Global") {
      base = base.filter(
        (d) =>
          (d.empresa || "").toLowerCase().trim() ===
          empresaSelecionada.toLowerCase().trim()
      );
    }

    if (anoSelecionado !== "todos") {
      base = base.filter(
        (d) =>
          d.data instanceof Date &&
          !isNaN(d.data) &&
          String(d.data.getFullYear()) === String(anoSelecionado)
      );
    }

    return base;
  }, [dados, empresaSelecionada, anoSelecionado]);

  const totais = useMemo(() => {
    const entradas = dadosFiltrados
      .filter((d) => d.tipo === "entrada")
      .reduce((acc, cur) => acc + (cur.valor || 0), 0);

    const saidas = dadosFiltrados
      .filter((d) => d.tipo === "saida" || d.tipo === "saída")
      .reduce((acc, cur) => acc + (cur.valor || 0), 0);

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [dadosFiltrados]);

  const dadosPorDia = useMemo(() => {
    const mapa = {};

    dadosFiltrados.forEach((item) => {
      const chave = formatDateISO(item.data);
      if (!chave) return;

      if (!mapa[chave]) {
        mapa[chave] = {
          data: chave,
          entradas: 0,
          saidas: 0,
        };
      }

      if (item.tipo === "entrada") mapa[chave].entradas += item.valor || 0;
      if (item.tipo === "saida" || item.tipo === "saída")
        mapa[chave].saidas += item.valor || 0;
    });

    const ordenado = Object.values(mapa).sort((a, b) =>
      a.data.localeCompare(b.data)
    );

    let saldoAcumulado = 0;

    return ordenado.map((item, index) => {
      saldoAcumulado += item.entradas - item.saidas;

      return {
        ...item,
        label: formatarDataCurta(item.data),
        saldoDia: item.entradas - item.saidas,
        saldoAcumulado,
        realizado: index < Math.max(ordenado.length - 4, 0) ? saldoAcumulado : null,
        projecao: index >= Math.max(ordenado.length - 4, 0) ? saldoAcumulado : null,
      };
    });
  }, [dadosFiltrados]);

  const ultimosDias = useMemo(() => dadosPorDia.slice(-18), [dadosPorDia]);

  const melhorRecebimento = useMemo(() => {
    if (!ultimosDias.length) return { valor: 0, data: "-" };
    const max = [...ultimosDias].sort((a, b) => b.entradas - a.entradas)[0];
    return {
      valor: max?.entradas || 0,
      data: max?.label || "-",
    };
  }, [ultimosDias]);

  const composicaoRecebimentos = useMemo(() => {
    const mapa = {};

    dadosFiltrados
      .filter((d) => d.tipo === "entrada")
      .forEach((item) => {
        const chave = item.categoria || "Sem categoria";
        if (!mapa[chave]) mapa[chave] = 0;
        mapa[chave] += item.valor || 0;
      });

    const palette = [COLORS.blue, COLORS.teal, COLORS.yellow, COLORS.red];

    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map((item, idx) => ({
        ...item,
        color: palette[idx],
      }));
  }, [dadosFiltrados]);

  const fluxoMensal = useMemo(() => {
    const entradasPorCategoria = {};
    const saidasPorCategoria = {};

    dadosFiltrados.forEach((item) => {
      if (!(item.data instanceof Date) || isNaN(item.data)) return;

      const month = item.data.getMonth();
      const categoria = item.categoria || "Sem categoria";

      if (item.tipo === "entrada") {
        if (!entradasPorCategoria[categoria]) {
          entradasPorCategoria[categoria] = new Array(12).fill(0);
        }
        entradasPorCategoria[categoria][month] += item.valor || 0;
      }

      if (item.tipo === "saida" || item.tipo === "saída") {
        if (!saidasPorCategoria[categoria]) {
          saidasPorCategoria[categoria] = new Array(12).fill(0);
        }
        saidasPorCategoria[categoria][month] += item.valor || 0;
      }
    });

    const totalEntradasMes = new Array(12).fill(0);
    const totalSaidasMes = new Array(12).fill(0);

    Object.values(entradasPorCategoria).forEach((arr) =>
      arr.forEach((v, i) => (totalEntradasMes[i] += v))
    );
    Object.values(saidasPorCategoria).forEach((arr) =>
      arr.forEach((v, i) => (totalSaidasMes[i] += v))
    );

    const saldoMes = totalEntradasMes.map((v, i) => v - totalSaidasMes[i]);

    return {
      entradasPorCategoria,
      saidasPorCategoria,
      totalEntradasMes,
      totalSaidasMes,
      saldoMes,
    };
  }, [dadosFiltrados]);

  const dreMensal = useMemo(() => {
    const receitaOperacional = new Array(12).fill(0);
    const outrasReceitas = new Array(12).fill(0);
    const despesasOperacionais = new Array(12).fill(0);
    const outrasDespesas = new Array(12).fill(0);

    dadosFiltrados.forEach((item) => {
      if (!(item.data instanceof Date) || isNaN(item.data)) return;
      const m = item.data.getMonth();
      const cat = (item.categoria || "").toLowerCase();

      if (item.tipo === "entrada") {
        if (
          cat.includes("venda") ||
          cat.includes("operacion") ||
          cat.includes("patroc")
        ) {
          receitaOperacional[m] += item.valor || 0;
        } else {
          outrasReceitas[m] += item.valor || 0;
        }
      }

      if (item.tipo === "saida" || item.tipo === "saída") {
        if (
          cat.includes("sal") ||
          cat.includes("alug") ||
          cat.includes("fornecedor") ||
          cat.includes("comiss") ||
          cat.includes("public")
        ) {
          despesasOperacionais[m] += item.valor || 0;
        } else {
          outrasDespesas[m] += item.valor || 0;
        }
      }
    });

    const receitaLiquida = receitaOperacional.map((v, i) => v + outrasReceitas[i]);
    const totalDespesas = despesasOperacionais.map(
      (v, i) => v + outrasDespesas[i]
    );
    const resultado = receitaLiquida.map((v, i) => v - totalDespesas[i]);

    return {
      receitaOperacional,
      outrasReceitas,
      receitaLiquida,
      despesasOperacionais,
      outrasDespesas,
      totalDespesas,
      resultado,
    };
  }, [dadosFiltrados]);

  const indicadoresComercial = useMemo(() => {
    const vendas = dadosFiltrados.filter((d) => d.tipo === "entrada");
    const faturamento = vendas.reduce((a, b) => a + (b.valor || 0), 0);
    const ticket = vendas.length ? faturamento / vendas.length : 0;

    const topCategorias = {};
    vendas.forEach((v) => {
      const chave = v.categoria || "Sem categoria";
      if (!topCategorias[chave]) topCategorias[chave] = 0;
      topCategorias[chave] += v.valor || 0;
    });

    const ranking = Object.entries(topCategorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      faturamento,
      pedidos: vendas.length,
      ticket,
      ranking,
    };
  }, [dadosFiltrados]);

  const indicadoresInadimplencia = useMemo(() => {
    const abertos = dadosFiltrados.filter((d) => {
      const status = (d.status || "").toLowerCase();
      return !status.includes("recebido") && !status.includes("pago");
    });

    const total = abertos.reduce((a, b) => a + (b.valor || 0), 0);

    const top = [...abertos]
      .sort((a, b) => (b.valor || 0) - (a.valor || 0))
      .slice(0, 10);

    return {
      total,
      quantidade: abertos.length,
      top,
    };
  }, [dadosFiltrados]);

  const currentContent = () => {
    switch (pagina) {
      case "fluxo":
        return (
          <FluxoPage
            empresaSelecionada={empresaSelecionada}
            ultimosDias={ultimosDias}
            composicaoRecebimentos={composicaoRecebimentos}
            totais={totais}
            melhorRecebimento={melhorRecebimento}
            fluxoMensal={fluxoMensal}
            fluxoExpandido={fluxoExpandido}
            setFluxoExpandido={setFluxoExpandido}
          />
        );
      case "dre":
        return (
          <DrePage
            totais={totais}
            dreMensal={dreMensal}
            dreExpandido={dreExpandido}
            setDreExpandido={setDreExpandido}
          />
        );
      case "comercial":
        return <ComercialPage indicadores={indicadoresComercial} />;
      case "inadimplencia":
        return <InadimplenciaPage indicadores={indicadoresInadimplencia} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      {menuMobileAberto && (
        <div
          className="mobile-overlay"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      <aside className={`sidebar ${menuMobileAberto ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">GPS</div>
          <div>
            <div className="brand-title">GPSBI</div>
            <div className="brand-subtitle">PLATAFORMA</div>
          </div>
        </div>

        <div className="section-label">CLIENTE ATIVO</div>

        <div className="client-box">
          <div className="client-name">Grupo Greener / Greendex</div>
          <div className="client-online">● Online</div>

          <div className="segment-group">
            <button
              className={`segment-btn ${
                empresaSelecionada === "Global" ? "active" : ""
              }`}
              onClick={() => setEmpresaSelecionada("Global")}
            >
              Global
            </button>
            <button
              className={`segment-btn ${
                empresaSelecionada === "Greener" ? "active" : ""
              }`}
              onClick={() => setEmpresaSelecionada("Greener")}
            >
              Greener
            </button>
            <button
              className={`segment-btn ${
                empresaSelecionada === "Greendex" ? "active" : ""
              }`}
              onClick={() => setEmpresaSelecionada("Greendex")}
            >
              Greendex
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <select
              className="year-select"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
            >
              <option value="todos">Todos os anos</option>
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="section-label">FINANCEIRO</div>
        <NavItem
          active={pagina === "fluxo"}
          onClick={() => {
            setPagina("fluxo");
            setMenuMobileAberto(false);
          }}
        >
          Fluxo de Caixa
        </NavItem>
        <NavItem
          active={pagina === "dre"}
          onClick={() => {
            setPagina("dre");
            setMenuMobileAberto(false);
          }}
        >
          DRE Projetada
        </NavItem>
        <NavItem
          active={pagina === "inadimplencia"}
          onClick={() => {
            setPagina("inadimplencia");
            setMenuMobileAberto(false);
          }}
        >
          Inadimplência
        </NavItem>

        <div className="section-label">COMERCIAL</div>
        <NavItem
          active={pagina === "comercial"}
          onClick={() => {
            setPagina("comercial");
            setMenuMobileAberto(false);
          }}
        >
          Painel Comercial
        </NavItem>

        <div className="section-label">GESTÃO</div>
        <NavItem disabled>Conciliação Bancária</NavItem>
        <NavItem disabled>Multiempresas</NavItem>

        <div className="sidebar-footer">
          <div className="admin-avatar">GP</div>
          <div>
            <div className="admin-title">GPSBI Admin</div>
            <div className="admin-subtitle">Administrador</div>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <div className="mobile-header">
          <button
            className="burger-btn"
            onClick={() => setMenuMobileAberto(true)}
          >
            ☰
          </button>
          <div className="mobile-brand-mini">GPSBI Platform</div>
        </div>

        {currentContent()}
      </main>
    </div>
  );
}

function FluxoPage({
  empresaSelecionada,
  ultimosDias,
  composicaoRecebimentos,
  totais,
  melhorRecebimento,
  fluxoMensal,
  fluxoExpandido,
  setFluxoExpandido,
}) {
  return (
    <>
      <section className="hero-box">
        <div className="hero-copy">
          <div className="hero-title">
            Bom dia, <span>Equipe GPSBI!</span> 👋
          </div>
          <div className="hero-text">
            Seus indicadores de hoje estão prontos. Continue tomando decisões
            com clareza e confiança — seus números estão trabalhando para você.
          </div>
        </div>
        <div className="hero-sparkle">✦</div>
      </section>

      <div className="page-topline">
        <div>
          <h1 className="page-title">Fluxo de Caixa</h1>
          <div className="page-subtitle">
            Visão diária • {empresaSelecionada}
          </div>
        </div>
      </div>

      <section className="metric-grid">
        <MetricCard
          title="RECEBIMENTOS TOTAIS"
          value={currency(totais.entradas)}
          helper="no período"
          tone="green"
        />
        <MetricCard
          title="PAGAMENTOS TOTAIS"
          value={currency(totais.saidas)}
          helper="saídas"
          tone="red"
        />
        <MetricCard
          title="SALDO FINAL BANCO"
          value={currency(totais.saldo)}
          helper="acumulado"
          tone={totais.saldo >= 0 ? "blue" : "red"}
        />
        <MetricCard
          title="MELHOR DIA"
          value={currency(melhorRecebimento.valor)}
          helper={`maior entrada • ${melhorRecebimento.data}`}
          tone="yellow"
        />
      </section>

      <section className="grid-two">
        <Panel title="RECEBIMENTOS VS PAGAMENTOS — DIÁRIO">
          <div className="chart-box h320">
            <ResponsiveContainer>
              <BarChart
                data={ultimosDias.map((d) => ({
                  ...d,
                  dataLabel: d.label,
                }))}
              >
                <CartesianGrid stroke="#1f3147" vertical={false} />
                <XAxis dataKey="dataLabel" stroke="#7f93ab" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#7f93ab"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatK(v)}
                />
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Bar
                  dataKey="entradas"
                  name="Recebimentos"
                  fill="#20d1a5"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="saidas"
                  name="Pagamentos"
                  fill="#ff5b5b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="COMPOSIÇÃO RECEBIMENTOS">
          <div className="chart-box h260">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={composicaoRecebimentos}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {composicaoRecebimentos.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="legend-list">
            {composicaoRecebimentos.map((item, idx) => (
              <div key={idx} className="legend-item">
                <div className="legend-left">
                  <span
                    className="legend-dot"
                    style={{ background: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <span>
                  {Math.round((item.value / (totais.entradas || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="SALDO ACUMULADO NO PERÍODO">
        <div className="timeline-wrap">
          <div className="chart-box h300">
            <ResponsiveContainer>
              <LineChart data={ultimosDias}>
                <CartesianGrid stroke="#1f3147" vertical={false} />
                <XAxis dataKey="label" stroke="#7f93ab" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#7f93ab"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatK(v)}
                />
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="realizado"
                  name="Realizado"
                  stroke="#1eb4ff"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="projecao"
                  name="Projeção"
                  stroke="#ffd166"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                  strokeDasharray="6 6"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      <Panel
        title="PLANO DE CONTAS — VISÃO MENSAL"
        actions={
          <div className="panel-actions">
            <button
              className="ghost-btn"
              onClick={() =>
                setFluxoExpandido({
                  recebimentos: true,
                  saidas: true,
                })
              }
            >
              Expandir tudo
            </button>
            <button
              className="ghost-btn"
              onClick={() =>
                setFluxoExpandido({
                  recebimentos: false,
                  saidas: false,
                })
              }
            >
              Recolher tudo
            </button>
          </div>
        }
      >
        <div className="table-scroll">
          <table className="tree-table">
            <thead>
              <tr>
                <th className="left-sticky">PLANO DE CONTAS</th>
                {MONTHS.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <TreeRow
                label="RECEBIMENTOS TOTAIS"
                level={0}
                values={fluxoMensal.totalEntradasMes}
                color="green"
                expandable
                expanded={fluxoExpandido.recebimentos}
                onToggle={() =>
                  setFluxoExpandido((prev) => ({
                    ...prev,
                    recebimentos: !prev.recebimentos,
                  }))
                }
              />

              {fluxoExpandido.recebimentos &&
                Object.entries(fluxoMensal.entradasPorCategoria)
                  .sort((a, b) => sumArr(b[1]) - sumArr(a[1]))
                  .map(([categoria, valores]) => (
                    <TreeRow
                      key={categoria}
                      label={categoria}
                      level={1}
                      values={valores}
                      color="green"
                    />
                  ))}

              <TreeRow
                label="SAÍDAS TOTAIS"
                level={0}
                values={fluxoMensal.totalSaidasMes.map((v) => -v)}
                color="red"
                expandable
                expanded={fluxoExpandido.saidas}
                onToggle={() =>
                  setFluxoExpandido((prev) => ({
                    ...prev,
                    saidas: !prev.saidas,
                  }))
                }
              />

              {fluxoExpandido.saidas &&
                Object.entries(fluxoMensal.saidasPorCategoria)
                  .sort((a, b) => sumArr(b[1]) - sumArr(a[1]))
                  .map(([categoria, valores]) => (
                    <TreeRow
                      key={categoria}
                      label={categoria}
                      level={1}
                      values={valores.map((v) => -v)}
                      color="red"
                    />
                  ))}

              <TreeRow
                label="SALDO CAIXA"
                level={0}
                values={fluxoMensal.saldoMes}
                color="white"
                dynamic
              />
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function DrePage({ totais, dreMensal, dreExpandido, setDreExpandido }) {
  return (
    <>
      <div className="page-topline">
        <div>
          <h1 className="page-title">DRE Projetada</h1>
          <div className="page-subtitle">
            Estrutura em plano de contas com expansão por grupos
          </div>
        </div>
      </div>

      <section className="metric-grid">
        <MetricCard
          title="RECEITA LÍQUIDA"
          value={currency(sumArr(dreMensal.receitaLiquida))}
          helper="no período"
          tone="green"
        />
        <MetricCard
          title="DESPESAS TOTAIS"
          value={currency(sumArr(dreMensal.totalDespesas))}
          helper="no período"
          tone="red"
        />
        <MetricCard
          title="RESULTADO"
          value={currency(sumArr(dreMensal.resultado))}
          helper="lucro / prejuízo"
          tone={sumArr(dreMensal.resultado) >= 0 ? "blue" : "red"}
        />
        <MetricCard
          title="MARGEM"
          value={`${(
            (sumArr(dreMensal.resultado) / (sumArr(dreMensal.receitaLiquida) || 1)) *
            100
          ).toFixed(1)}%`}
          helper="resultado / receita"
          tone="yellow"
        />
      </section>

      <Panel
        title="DRE — VISÃO MENSAL"
        actions={
          <div className="panel-actions">
            <button
              className="ghost-btn"
              onClick={() =>
                setDreExpandido({
                  receita: true,
                  despesas: true,
                })
              }
            >
              Expandir tudo
            </button>
            <button
              className="ghost-btn"
              onClick={() =>
                setDreExpandido({
                  receita: false,
                  despesas: false,
                })
              }
            >
              Recolher tudo
            </button>
          </div>
        }
      >
        <div className="table-scroll">
          <table className="tree-table">
            <thead>
              <tr>
                <th className="left-sticky">ESTRUTURA DRE</th>
                {MONTHS.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <TreeRow
                label="RECEITAS"
                level={0}
                values={dreMensal.receitaLiquida}
                color="green"
                expandable
                expanded={dreExpandido.receita}
                onToggle={() =>
                  setDreExpandido((prev) => ({
                    ...prev,
                    receita: !prev.receita,
                  }))
                }
              />
              {dreExpandido.receita && (
                <>
                  <TreeRow
                    label="Receita Operacional"
                    level={1}
                    values={dreMensal.receitaOperacional}
                    color="green"
                  />
                  <TreeRow
                    label="Outras Receitas"
                    level={1}
                    values={dreMensal.outrasReceitas}
                    color="green"
                  />
                </>
              )}

              <TreeRow
                label="DESPESAS"
                level={0}
                values={dreMensal.totalDespesas.map((v) => -v)}
                color="red"
                expandable
                expanded={dreExpandido.despesas}
                onToggle={() =>
                  setDreExpandido((prev) => ({
                    ...prev,
                    despesas: !prev.despesas,
                  }))
                }
              />
              {dreExpandido.despesas && (
                <>
                  <TreeRow
                    label="Despesas Operacionais"
                    level={1}
                    values={dreMensal.despesasOperacionais.map((v) => -v)}
                    color="red"
                  />
                  <TreeRow
                    label="Outras Despesas"
                    level={1}
                    values={dreMensal.outrasDespesas.map((v) => -v)}
                    color="red"
                  />
                </>
              )}

              <TreeRow
                label="RESULTADO"
                level={0}
                values={dreMensal.resultado}
                color="white"
                dynamic
              />
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ComercialPage({ indicadores }) {
  return (
    <>
      <div className="page-topline">
        <div>
          <h1 className="page-title">Painel Comercial</h1>
          <div className="page-subtitle">
            Métricas comerciais e categorias com maior peso
          </div>
        </div>
      </div>

      <section className="metric-grid">
        <MetricCard
          title="FATURAMENTO"
          value={currency(indicadores.faturamento)}
          helper="receitas no período"
          tone="green"
        />
        <MetricCard
          title="LANÇAMENTOS"
          value={String(indicadores.pedidos)}
          helper="quantidade de entradas"
          tone="blue"
        />
        <MetricCard
          title="TICKET MÉDIO"
          value={currency(indicadores.ticket)}
          helper="média por lançamento"
          tone="yellow"
        />
        <MetricCard
          title="TOP CATEGORIAS"
          value={String(indicadores.ranking.length)}
          helper="em destaque"
          tone="blue"
        />
      </section>

      <Panel title="RANKING DE CATEGORIAS">
        <div className="simple-list">
          {indicadores.ranking.map((item, idx) => (
            <div key={idx} className="simple-list-item">
              <div className="simple-list-title">{item.name}</div>
              <div className="simple-list-value">{currency(item.value)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function InadimplenciaPage({ indicadores }) {
  return (
    <>
      <div className="page-topline">
        <div>
          <h1 className="page-title">Inadimplência</h1>
          <div className="page-subtitle">
            Pendências financeiras em aberto para acompanhamento
          </div>
        </div>
      </div>

      <section className="metric-grid">
        <MetricCard
          title="TOTAL EM ABERTO"
          value={currency(indicadores.total)}
          helper="soma das pendências"
          tone="red"
        />
        <MetricCard
          title="REGISTROS"
          value={String(indicadores.quantidade)}
          helper="lançamentos em aberto"
          tone="yellow"
        />
      </section>

      <Panel title="TOP PENDÊNCIAS">
        <div className="table-scroll">
          <table className="basic-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.top.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.empresa}</td>
                  <td>{item.dataOriginal}</td>
                  <td>{item.descricao}</td>
                  <td>{item.status}</td>
                  <td>{currency(item.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function MetricCard({ title, value, helper, tone = "blue" }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-helper">{helper}</div>
    </div>
  );
}

function Panel({ title, children, actions }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function NavItem({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TreeRow({
  label,
  values,
  level = 0,
  color = "white",
  expandable = false,
  expanded = false,
  onToggle,
  dynamic = false,
}) {
  const total = sumArr(values);

  return (
    <tr>
      <td className={`tree-label level-${level}`}>
        <div className="tree-label-inner">
          {expandable ? (
            <button className="expand-btn" onClick={onToggle} type="button">
              {expanded ? "−" : "+"}
            </button>
          ) : (
            <span className="expand-placeholder" />
          )}
          <span>{label}</span>
        </div>
      </td>

      {values.map((v, idx) => (
        <td
          key={idx}
          className={`tree-value tone-${color} ${
            dynamic ? (v >= 0 ? "positive" : "negative") : ""
          }`}
        >
          {v === 0 ? "-" : moneyShort(v)}
        </td>
      ))}

      <td
        className={`tree-value tone-${color} ${
          dynamic ? (total >= 0 ? "positive" : "negative") : ""
        } strong`}
      >
        {moneyShort(total)}
      </td>
    </tr>
  );
}

function parseDateSafe(value) {
  if (!value) return null;
  const dt = new Date(value);
  if (!isNaN(dt)) return dt;
  return null;
}

function formatDateISO(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  return date.toISOString().slice(0, 10);
}

function formatarDataCurta(data) {
  if (!data) return "-";
  const partes = String(data).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
  return data;
}

function formatK(valor) {
  if (Math.abs(valor) >= 1000) return `R$${Math.round(valor / 1000)}k`;
  return `R$${valor}`;
}

function moneyShort(valor) {
  return (valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function currency(valor) {
  return (valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function sumArr(arr = []) {
  return arr.reduce((a, b) => a + b, 0);
}

const tooltipStyle = {
  backgroundColor: "#0b1220",
  border: "1px solid #1f3147",
  borderRadius: "10px",
};
