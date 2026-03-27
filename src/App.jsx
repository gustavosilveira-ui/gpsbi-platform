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
  green: "#20d1a5",
  red: "#ff5b5b",
  yellow: "#ffd166",
  teal: "#24c7b2",
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

  const [fluxoExpandido, setFluxoExpandido] = useState({
    recebimentos: false,
    recebimentosEfetivos: false,
    saidas: false,
    saidasEfetivas: false,
    pagamentosTotais: false,
    pagamentosVariaveis: false,
    pagamentosFixos: false,
    emprestimosSaidas: false,
    deducoes: false,
    movimentacoesSaidas: false,
  });

  const [dreExpandido, setDreExpandido] = useState({
    receitas: false,
    receitasOperacionais: false,
    outrasReceitas: false,
    despesas: false,
    despesasOperacionais: false,
    outrasDespesas: false,
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
    const receitaOperacional = {};
    const outrasReceitas = {};
    const despesasOperacionais = {};
    const outrasDespesas = {};

    const somaMes = (obj, categoria, mes, valor) => {
      if (!obj[categoria]) obj[categoria] = new Array(12).fill(0);
      obj[categoria][mes] += valor;
    };

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
          somaMes(receitaOperacional, item.categoria, m, item.valor || 0);
        } else {
          somaMes(outrasReceitas, item.categoria, m, item.valor || 0);
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
          somaMes(despesasOperacionais, item.categoria, m, item.valor || 0);
        } else {
          somaMes(outrasDespesas, item.categoria, m, item.valor || 0);
        }
      }
    });

    const sumObjMonths = (obj) => {
      const total = new Array(12).fill(0);
      Object.values(obj).forEach((arr) =>
        arr.forEach((v, i) => (total[i] += v))
      );
      return total;
    };

    const receitaOperacionalTotal = sumObjMonths(receitaOperacional);
    const outrasReceitasTotal = sumObjMonths(outrasReceitas);
    const despesasOperacionaisTotal = sumObjMonths(despesasOperacionais);
    const outrasDespesasTotal = sumObjMonths(outrasDespesas);

    const receitaLiquida = receitaOperacionalTotal.map(
      (v, i) => v + outrasReceitasTotal[i]
    );
    const totalDespesas = despesasOperacionaisTotal.map(
      (v, i) => v + outrasDespesasTotal[i]
    );
    const resultado = receitaLiquida.map((v, i) => v - totalDespesas[i]);

    return {
      receitaOperacional,
      outrasReceitas,
      despesasOperacionais,
      outrasDespesas,
      receitaOperacionalTotal,
      outrasReceitasTotal,
      receitaLiquida,
      despesasOperacionaisTotal,
      outrasDespesasTotal,
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

  const greeting = getGreeting();

  const conteudoPagina = () => {
    switch (pagina) {
      case "fluxo":
        return (
          <FluxoPage
            greeting={greeting}
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
            greeting={greeting}
            totais={totais}
            dreMensal={dreMensal}
            dreExpandido={dreExpandido}
            setDreExpandido={setDreExpandido}
          />
        );
      case "comercial":
        return <ComercialPage greeting={greeting} indicadores={indicadoresComercial} />;
      case "inadimplencia":
        return (
          <InadimplenciaPage
            greeting={greeting}
            indicadores={indicadoresInadimplencia}
          />
        );
      default:
        return null;
    }
  };

  if (!logado) {
    return (
      <div className="login-wrap">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-sparkle">✦</div>

        <div className="login-card">
          <div className="login-left">
            <div className="login-title">GPSBI Platform</div>

            <div className="welcome-box">
              <div className="welcome-head">Seja muito bem-vindo! ✨</div>
              <div className="welcome-text">
                Aqui seus números viram{" "}
                <span>decisões que transformam</span>.
                <br />
                Faça login para acessar seu painel.
              </div>
            </div>

            <InfoBox
              title="Clareza para decidir"
              text="Visual executivo, leitura prática e dados que ajudam o cliente a agir com segurança."
            />
            <InfoBox
              title="Experiência premium GPSBI"
              text="Mais valor percebido, mais encantamento e menos dependência de ferramentas genéricas."
            />
            <InfoBox
              title="Base pronta para evoluir"
              text="Login real, permissões por cliente, multiempresa e módulos especializados."
            />
          </div>

          <div className="login-right">
            <div className="small-label">ACESSO DO CLIENTE</div>
            <div className="login-form-title">Entrar na plataforma</div>

            <label className="field-label">E-mail</label>
            <input
              className="field-input"
              defaultValue="cliente@gpsbi.com.br"
            />

            <label className="field-label top-gap">Senha</label>
            <input
              className="field-input"
              type="password"
              defaultValue="12345678"
            />

            <button className="primary-btn" onClick={() => setLogado(true)}>
              Entrar
            </button>

            <div className="login-note">
              Nesta fase é um protótipo visual. Na próxima evolução conectamos
              autenticação real, banco de usuários e controle de acesso por
              cliente.
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <NavItem disabled>Metas & OKRs</NavItem>

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

        <header className="top-strip">
          <div>
            <div className="top-strip-title">
              {pagina === "fluxo" && "Fluxo de Caixa"}
              {pagina === "dre" && "DRE Projetada"}
              {pagina === "comercial" && "Painel Comercial"}
              {pagina === "inadimplencia" && "Inadimplência"}
            </div>
            <div className="top-strip-sub">
              Visão diária · {capitalize(greeting)} ·{" "}
              {new Date().toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="top-right-controls">
            <div className="segment-group top-right-segments">
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

            <select
              className="year-select top-year"
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
        </header>

        {conteudoPagina()}
      </main>
    </div>
  );
}

function FluxoPage({
  greeting,
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
            {capitalize(greeting)}, <span>Equipe GPSBI!</span> 👋
          </div>
          <div className="hero-text">
            Seus indicadores de hoje estão prontos. Continue tomando decisões com
            clareza e confiança — seus números estão trabalhando para você.
          </div>
        </div>
        <div className="hero-sparkle">✦</div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="RECEBIMENTOS TOTAIS"
          value={currencyCompact(totais.entradas)}
          helper="no período"
          tone="green"
        />
        <MetricCard
          title="PAGAMENTOS TOTAIS"
          value={currencyCompact(totais.saidas)}
          helper="saídas"
          tone="red"
        />
        <MetricCard
          title="SALDO FINAL BANCO"
          value={currencyCompact(totais.saldo)}
          helper="acumulado"
          tone={totais.saldo >= 0 ? "blue" : "red"}
        />
        <MetricCard
          title="MELHOR DIA"
          value={currencyCompact(melhorRecebimento.valor)}
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
              <div className="legend-item" key={idx}>
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

      <Panel title="SALDO ACUMULADO NO MÊS">
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
                  recebimentosEfetivos: true,
                  saidas: true,
                  saidasEfetivas: true,
                  pagamentosTotais: true,
                  pagamentosVariaveis: true,
                  pagamentosFixos: true,
                  emprestimosSaidas: true,
                  deducoes: true,
                  movimentacoesSaidas: true,
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
                  recebimentosEfetivos: false,
                  saidas: false,
                  saidasEfetivas: false,
                  pagamentosTotais: false,
                  pagamentosVariaveis: false,
                  pagamentosFixos: false,
                  emprestimosSaidas: false,
                  deducoes: false,
                  movimentacoesSaidas: false,
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

              {fluxoExpandido.recebimentos && (
                <>
                  <TreeRow
                    label="RECEBIMENTOS EFETIVOS"
                    level={1}
                    values={fluxoMensal.totalEntradasMes}
                    color="green"
                    expandable
                    expanded={fluxoExpandido.recebimentosEfetivos}
                    onToggle={() =>
                      setFluxoExpandido((prev) => ({
                        ...prev,
                        recebimentosEfetivos: !prev.recebimentosEfetivos,
                      }))
                    }
                  />

                  {fluxoExpandido.recebimentosEfetivos &&
                    Object.entries(fluxoMensal.entradasPorCategoria)
                      .sort((a, b) => sumArr(b[1]) - sumArr(a[1]))
                      .map(([categoria, valores]) => (
                        <TreeRow
                          key={categoria}
                          label={categoria}
                          level={2}
                          values={valores}
                          color="green"
                        />
                      ))}
                </>
              )}

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

              {fluxoExpandido.saidas && (
                <>
                  <TreeRow
                    label="SAÍDAS EFETIVAS"
                    level={1}
                    values={fluxoMensal.totalSaidasMes.map((v) => -v)}
                    color="red"
                    expandable
                    expanded={fluxoExpandido.saidasEfetivas}
                    onToggle={() =>
                      setFluxoExpandido((prev) => ({
                        ...prev,
                        saidasEfetivas: !prev.saidasEfetivas,
                      }))
                    }
                  />

                  {fluxoExpandido.saidasEfetivas && (
                    <>
                      <TreeRow
                        label="Pagamentos Totais"
                        level={2}
                        values={sumCategoriesByKeyword(
                          fluxoMensal.saidasPorCategoria,
                          ["pag", "fornecedor", "alug", "sal", "enc", "public", "comiss", "sistema"]
                        ).map((v) => -v)}
                        color="red"
                        expandable
                        expanded={fluxoExpandido.pagamentosTotais}
                        onToggle={() =>
                          setFluxoExpandido((prev) => ({
                            ...prev,
                            pagamentosTotais: !prev.pagamentosTotais,
                          }))
                        }
                      />

                      {fluxoExpandido.pagamentosTotais && (
                        <>
                          <TreeRow
                            label="Pagamentos Variáveis"
                            level={3}
                            values={sumCategoriesByKeyword(
                              fluxoMensal.saidasPorCategoria,
                              ["fornecedor", "comiss", "public"]
                            ).map((v) => -v)}
                            color="red"
                            expandable
                            expanded={fluxoExpandido.pagamentosVariaveis}
                            onToggle={() =>
                              setFluxoExpandido((prev) => ({
                                ...prev,
                                pagamentosVariaveis: !prev.pagamentosVariaveis,
                              }))
                            }
                          />

                          {fluxoExpandido.pagamentosVariaveis &&
                            filterCategoriesByKeyword(fluxoMensal.saidasPorCategoria, [
                              "fornecedor",
                              "comiss",
                              "public",
                            ]).map(([categoria, valores]) => (
                              <TreeRow
                                key={categoria}
                                label={categoria}
                                level={4}
                                values={valores.map((v) => -v)}
                                color="red"
                              />
                            ))}

                          <TreeRow
                            label="Pagamentos Fixos"
                            level={3}
                            values={sumCategoriesByKeyword(
                              fluxoMensal.saidasPorCategoria,
                              ["sal", "enc", "alug", "sistema"]
                            ).map((v) => -v)}
                            color="red"
                            expandable
                            expanded={fluxoExpandido.pagamentosFixos}
                            onToggle={() =>
                              setFluxoExpandido((prev) => ({
                                ...prev,
                                pagamentosFixos: !prev.pagamentosFixos,
                              }))
                            }
                          />

                          {fluxoExpandido.pagamentosFixos &&
                            filterCategoriesByKeyword(fluxoMensal.saidasPorCategoria, [
                              "sal",
                              "enc",
                              "alug",
                              "sistema",
                            ]).map(([categoria, valores]) => (
                              <TreeRow
                                key={categoria}
                                label={categoria}
                                level={4}
                                values={valores.map((v) => -v)}
                                color="red"
                              />
                            ))}
                        </>
                      )}

                      <TreeRow
                        label="Empréstimos e Movimentações (Saídas)"
                        level={2}
                        values={sumCategoriesByKeyword(
                          fluxoMensal.saidasPorCategoria,
                          ["empr", "antecipa", "banco", "sócio", "movimenta"]
                        ).map((v) => -v)}
                        color="red"
                        expandable
                        expanded={fluxoExpandido.emprestimosSaidas}
                        onToggle={() =>
                          setFluxoExpandido((prev) => ({
                            ...prev,
                            emprestimosSaidas: !prev.emprestimosSaidas,
                          }))
                        }
                      />

                      {fluxoExpandido.emprestimosSaidas &&
                        filterCategoriesByKeyword(fluxoMensal.saidasPorCategoria, [
                          "empr",
                          "antecipa",
                          "banco",
                          "sócio",
                          "movimenta",
                        ]).map(([categoria, valores]) => (
                          <TreeRow
                            key={categoria}
                            label={categoria}
                            level={3}
                            values={valores.map((v) => -v)}
                            color="red"
                          />
                        ))}

                      <TreeRow
                        label="Deduções da Receita / Tributos"
                        level={2}
                        values={sumCategoriesByKeyword(
                          fluxoMensal.saidasPorCategoria,
                          ["imposto", "tribut", "reten", "taxa", "dedu"]
                        ).map((v) => -v)}
                        color="red"
                        expandable
                        expanded={fluxoExpandido.deducoes}
                        onToggle={() =>
                          setFluxoExpandido((prev) => ({
                            ...prev,
                            deducoes: !prev.deducoes,
                          }))
                        }
                      />

                      {fluxoExpandido.deducoes &&
                        filterCategoriesByKeyword(fluxoMensal.saidasPorCategoria, [
                          "imposto",
                          "tribut",
                          "reten",
                          "taxa",
                          "dedu",
                        ]).map(([categoria, valores]) => (
                          <TreeRow
                            key={categoria}
                            label={categoria}
                            level={3}
                            values={valores.map((v) => -v)}
                            color="red"
                          />
                        ))}

                      <TreeRow
                        label="Movimentações (Saídas)"
                        level={2}
                        values={sumCategoriesByKeyword(
                          fluxoMensal.saidasPorCategoria,
                          ["movimenta"]
                        ).map((v) => -v)}
                        color="red"
                        expandable
                        expanded={fluxoExpandido.movimentacoesSaidas}
                        onToggle={() =>
                          setFluxoExpandido((prev) => ({
                            ...prev,
                            movimentacoesSaidas: !prev.movimentacoesSaidas,
                          }))
                        }
                      />

                      {fluxoExpandido.movimentacoesSaidas &&
                        filterCategoriesByKeyword(fluxoMensal.saidasPorCategoria, [
                          "movimenta",
                        ]).map(([categoria, valores]) => (
                          <TreeRow
                            key={categoria}
                            label={categoria}
                            level={3}
                            values={valores.map((v) => -v)}
                            color="red"
                          />
                        ))}
                    </>
                  )}
                </>
              )}

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

function DrePage({ greeting, totais, dreMensal, dreExpandido, setDreExpandido }) {
  return (
    <>
      <section className="hero-box compact">
        <div className="hero-copy">
          <div className="hero-title">
            {capitalize(greeting)}, <span>Equipe GPSBI!</span> ✨
          </div>
          <div className="hero-text">
            Aqui a DRE ganha estrutura visual, leitura por grupos e clareza para
            acompanhar o resultado.
          </div>
        </div>
        <div className="hero-sparkle">✦</div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="RECEITA LÍQUIDA"
          value={currencyCompact(sumArr(dreMensal.receitaLiquida))}
          helper="no período"
          tone="green"
        />
        <MetricCard
          title="DESPESAS TOTAIS"
          value={currencyCompact(sumArr(dreMensal.totalDespesas))}
          helper="no período"
          tone="red"
        />
        <MetricCard
          title="RESULTADO"
          value={currencyCompact(sumArr(dreMensal.resultado))}
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
                  receitas: true,
                  receitasOperacionais: true,
                  outrasReceitas: true,
                  despesas: true,
                  despesasOperacionais: true,
                  outrasDespesas: true,
                })
              }
            >
              Expandir tudo
            </button>
            <button
              className="ghost-btn"
              onClick={() =>
                setDreExpandido({
                  receitas: false,
                  receitasOperacionais: false,
                  outrasReceitas: false,
                  despesas: false,
                  despesasOperacionais: false,
                  outrasDespesas: false,
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
                expanded={dreExpandido.receitas}
                onToggle={() =>
                  setDreExpandido((prev) => ({
                    ...prev,
                    receitas: !prev.receitas,
                  }))
                }
              />

              {dreExpandido.receitas && (
                <>
                  <TreeRow
                    label="Receita Operacional"
                    level={1}
                    values={dreMensal.receitaOperacionalTotal}
                    color="green"
                    expandable
                    expanded={dreExpandido.receitasOperacionais}
                    onToggle={() =>
                      setDreExpandido((prev) => ({
                        ...prev,
                        receitasOperacionais: !prev.receitasOperacionais,
                      }))
                    }
                  />

                  {dreExpandido.receitasOperacionais &&
                    Object.entries(dreMensal.receitaOperacional).map(
                      ([categoria, valores]) => (
                        <TreeRow
                          key={categoria}
                          label={categoria}
                          level={2}
                          values={valores}
                          color="green"
                        />
                      )
                    )}

                  <TreeRow
                    label="Outras Receitas"
                    level={1}
                    values={dreMensal.outrasReceitasTotal}
                    color="green"
                    expandable
                    expanded={dreExpandido.outrasReceitas}
                    onToggle={() =>
                      setDreExpandido((prev) => ({
                        ...prev,
                        outrasReceitas: !prev.outrasReceitas,
                      }))
                    }
                  />

                  {dreExpandido.outrasReceitas &&
                    Object.entries(dreMensal.outrasReceitas).map(
                      ([categoria, valores]) => (
                        <TreeRow
                          key={categoria}
                          label={categoria}
                          level={2}
                          values={valores}
                          color="green"
                        />
                      )
                    )}
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
                    values={dreMensal.despesasOperacionaisTotal.map((v) => -v)}
                    color="red"
                    expandable
                    expanded={dreExpandido.despesasOperacionais}
                    onToggle={() =>
                      setDreExpandido((prev) => ({
                        ...prev,
                        despesasOperacionais: !prev.despesasOperacionais,
                      }))
                    }
                  />

                  {dreExpandido.despesasOperacionais &&
                    Object.entries(dreMensal.despesasOperacionais).map(
                      ([categoria, valores]) => (
                        <TreeRow
                          key={categoria}
                          label={categoria}
                          level={2}
                          values={valores.map((v) => -v)}
                          color="red"
                        />
                      )
                    )}

                  <TreeRow
                    label="Outras Despesas"
                    level={1}
                    values={dreMensal.outrasDespesasTotal.map((v) => -v)}
                    color="red"
                    expandable
                    expanded={dreExpandido.outrasDespesas}
                    onToggle={() =>
                      setDreExpandido((prev) => ({
                        ...prev,
                        outrasDespesas: !prev.outrasDespesas,
                      }))
                    }
                  />

                  {dreExpandido.outrasDespesas &&
                    Object.entries(dreMensal.outrasDespesas).map(
                      ([categoria, valores]) => (
                        <TreeRow
                          key={categoria}
                          label={categoria}
                          level={2}
                          values={valores.map((v) => -v)}
                          color="red"
                        />
                      )
                    )}
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

function ComercialPage({ greeting, indicadores }) {
  return (
    <>
      <section className="hero-box compact">
        <div className="hero-copy">
          <div className="hero-title">
            {capitalize(greeting)}, <span>Equipe GPSBI!</span> 📈
          </div>
          <div className="hero-text">
            Aqui você acompanha faturamento, ticket e categorias com maior peso
            comercial.
          </div>
        </div>
        <div className="hero-sparkle">✦</div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="FATURAMENTO"
          value={currencyCompact(indicadores.faturamento)}
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
          value={currencyCompact(indicadores.ticket)}
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

function InadimplenciaPage({ greeting, indicadores }) {
  return (
    <>
      <section className="hero-box compact">
        <div className="hero-copy">
          <div className="hero-title">
            {capitalize(greeting)}, <span>Equipe GPSBI!</span> ⚠️
          </div>
          <div className="hero-text">
            Aqui você acompanha pendências em aberto e os principais itens que
            exigem atenção.
          </div>
        </div>
        <div className="hero-sparkle">✦</div>
      </section>

      <section className="metric-grid">
        <MetricCard
          title="TOTAL EM ABERTO"
          value={currencyCompact(indicadores.total)}
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

function InfoBox({ title, text }) {
  return (
    <div className="info-box">
      <div className="info-title">{title}</div>
      <div className="info-text">{text}</div>
    </div>
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

function getGreeting() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
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

function currencyCompact(valor) {
  const abs = Math.abs(valor || 0);
  if (abs >= 1000000) return `R$${(valor / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `R$${Math.round(valor / 1000)}k`;
  return currency(valor);
}

function sumArr(arr = []) {
  return arr.reduce((a, b) => a + b, 0);
}

function filterCategoriesByKeyword(obj, keywords) {
  return Object.entries(obj).filter(([categoria]) => {
    const nome = (categoria || "").toLowerCase();
    return keywords.some((k) => nome.includes(k));
  });
}

function sumCategoriesByKeyword(obj, keywords) {
  const total = new Array(12).fill(0);

  filterCategoriesByKeyword(obj, keywords).forEach(([, valores]) => {
    valores.forEach((v, i) => {
      total[i] += v;
    });
  });

  return total;
}

const tooltipStyle = {
  backgroundColor: "#0b1220",
  border: "1px solid #1f3147",
  borderRadius: "10px",
};
