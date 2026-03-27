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

const COLORS = {
  bg: "#08131f",
  bg2: "#0b1730",
  panel: "#0f1c2b",
  panelSoft: "#122235",
  border: "#1f3147",
  text: "#e8f0f7",
  muted: "#7f93ab",
  blue: "#1eb4ff",
  green: "#20d1a5",
  red: "#ff5b5b",
  yellow: "#ffd166",
  teal: "#24c7b2",
  cyan: "#1eb4ff",
  orange: "#f59e0b",
};

export default function App() {
  const [dados, setDados] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("Global");
  const [logado, setLogado] = useState(false);

  const URL = "/api/fluxo";

  useEffect(() => {
    fetch(URL)
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

            return {
              empresa: limparCampo(col[0]),
              tipo: limparCampo(col[1]).toLowerCase(),
              data: limparCampo(col[2]),
              descricao: limparCampo(col[3]),
              categoria: limparCampo(col[4]),
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

  const dadosEmpresa = useMemo(() => {
    if (empresaSelecionada === "Global") return dados;

    return dados.filter(
      (d) =>
        (d.empresa || "").toLowerCase().trim() ===
        empresaSelecionada.toLowerCase().trim()
    );
  }, [dados, empresaSelecionada]);

  const dadosPorData = useMemo(() => {
    const mapa = {};

    dadosEmpresa.forEach((item) => {
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

    const ordenado = Object.values(mapa).sort((a, b) =>
      String(a.data).localeCompare(String(b.data))
    );

    let acumulado = 0;

    return ordenado.map((item) => {
      acumulado += item.entradas - item.saidas;

      return {
        ...item,
        saldoDia: item.entradas - item.saidas,
        saldoAcumulado: acumulado,
      };
    });
  }, [dadosEmpresa]);

  const ultimosDias = useMemo(() => {
    return dadosPorData.slice(-18);
  }, [dadosPorData]);

  const totalEntradas = dadosEmpresa
    .filter((d) => d.tipo === "entrada")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const totalSaidas = dadosEmpresa
    .filter((d) => d.tipo === "saida" || d.tipo === "saída")
    .reduce((acc, cur) => acc + (cur.valor || 0), 0);

  const saldoFinal = totalEntradas - totalSaidas;

  const melhorRecebimento =
    ultimosDias.length > 0
      ? Math.max(...ultimosDias.map((d) => d.entradas || 0))
      : 0;

  const melhorRecebimentoDia =
    ultimosDias.find((d) => d.entradas === melhorRecebimento)?.data || "-";

  const composicaoRecebimentos = useMemo(() => {
    const mapa = {};

    dadosEmpresa
      .filter((d) => d.tipo === "entrada")
      .forEach((item) => {
        const categoria = item.categoria || "Sem categoria";
        if (!mapa[categoria]) mapa[categoria] = 0;
        mapa[categoria] += item.valor || 0;
      });

    const ordenado = Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    const palette = [COLORS.cyan, COLORS.teal, COLORS.yellow, COLORS.red];

    return ordenado.map((item, idx) => ({
      ...item,
      color: palette[idx],
    }));
  }, [dadosEmpresa]);

  const linhaSaldo = useMemo(() => {
    const base = ultimosDias;
    const inicioProjecao = Math.max(base.length - 4, 0);

    return base.map((item, idx) => ({
      data: formatarDataCurta(item.data),
      realizado: idx < inicioProjecao ? item.saldoAcumulado : null,
      projecao: idx >= inicioProjecao ? item.saldoAcumulado : null,
    }));
  }, [ultimosDias]);

  const tabelaHorizontal = useMemo(() => {
    const datas = ultimosDias.map((d) => d.data);

    return {
      datas,
      recebimentos: ultimosDias.map((d) => d.entradas),
      pagamentos: ultimosDias.map((d) => d.saidas),
      saldoDia: ultimosDias.map((d) => d.saldoDia),
      saldoAcumulado: ultimosDias.map((d) => d.saldoAcumulado),
    };
  }, [ultimosDias]);

  const formatCurrency = (valor) =>
    (valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  if (!logado) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginGlow} />
        <div style={styles.loginCard}>
          <div style={styles.loginLeft}>
            <div style={styles.loginTitle}>GPSBI Platform</div>
            <div style={styles.loginText}>
              Protótipo da futura plataforma própria da GPSBI, com acesso
              seguro, experiência premium e visão executiva para cada cliente.
            </div>

            <InfoBox
              title="Ambiente com acesso protegido"
              text="Base pronta para evoluir para login por cliente, sessão e permissões."
            />
            <InfoBox
              title="Multiempresa e multicliente"
              text="Estrutura pensada para Greener, Greendex e futuros clientes em uma mesma plataforma."
            />
            <InfoBox
              title="Experiência premium GPSBI"
              text="Mais valor percebido, mais encantamento e menos dependência de ferramentas de terceiros."
            />
          </div>

          <div style={styles.loginRight}>
            <div style={styles.eyebrow}>ACESSO DO CLIENTE</div>
            <div style={styles.loginFormTitle}>Entrar na plataforma</div>

            <label style={styles.label}>E-mail</label>
            <input
              defaultValue="cliente@gpsbi.com.br"
              style={styles.input}
              placeholder="cliente@gpsbi.com.br"
            />

            <label style={{ ...styles.label, marginTop: 16 }}>Senha</label>
            <input
              type="password"
              defaultValue="12345678"
              style={styles.input}
              placeholder="********"
            />

            <button style={styles.primaryButton} onClick={() => setLogado(true)}>
              Entrar
            </button>

            <div style={styles.loginObs}>
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
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logo}>GPSBI</div>
          <div style={styles.logoSub}>CONSULTORIA</div>
        </div>

        <div style={styles.sideLabel}>CLIENTE ATIVO</div>

        <div style={styles.clientCard}>
          <div style={styles.clientName}>Grupo Greener</div>

          <div style={{ marginTop: 16 }}>
            <SegmentButton
              active={empresaSelecionada === "Global"}
              onClick={() => setEmpresaSelecionada("Global")}
            >
              Global
            </SegmentButton>
            <SegmentButton
              active={empresaSelecionada === "Greener"}
              onClick={() => setEmpresaSelecionada("Greener")}
            >
              Greener
            </SegmentButton>
            <SegmentButton
              active={empresaSelecionada === "Greendex"}
              onClick={() => setEmpresaSelecionada("Greendex")}
            >
              Greendex
            </SegmentButton>
          </div>
        </div>

        <div style={styles.sideLabel}>MENU</div>

        <MenuItem active>Fluxo de Caixa</MenuItem>
        <MenuItem>DRE Projetada</MenuItem>
        <MenuItem>Comercial</MenuItem>
        <MenuItem>Inadimplência</MenuItem>

        <div style={styles.sideFooter}>
          <div style={styles.sideFooterTitle}>Visão da plataforma</div>
          <div style={styles.sideFooterText}>
            O objetivo aqui é transformar a GPSBI em uma experiência própria,
            segura e encantadora para o cliente final.
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <input
            placeholder="Buscar cliente, indicador ou página"
            style={styles.search}
          />

          <div style={styles.topbarBadges}>
            <span style={styles.topbarBadge}>Ambiente protótipo</span>
            <span style={styles.topbarBadge}>Atualizado agora</span>
          </div>
        </div>

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Fluxo de Caixa</h1>
            <div style={styles.subtitle}>
              Visão diária com realizado e projeção, desenhada para a futura
              plataforma da GPSBI.
            </div>
          </div>
        </div>

        <div style={styles.cardGrid}>
          <MetricCard
            title="RECEBIMENTOS TOTAIS"
            value={formatCurrency(totalEntradas)}
            helper="no período"
            color={COLORS.green}
          />
          <MetricCard
            title="PAGAMENTOS TOTAIS"
            value={formatCurrency(totalSaidas)}
            helper="no período"
            color={COLORS.red}
          />
          <MetricCard
            title="SALDO FINAL BANCO"
            value={formatCurrency(saldoFinal)}
            helper="acumulado"
            color={saldoFinal >= 0 ? COLORS.blue : COLORS.red}
          />
          <MetricCard
            title="MELHOR RECEBIMENTO"
            value={formatCurrency(melhorRecebimento)}
            helper={`dia ${melhorRecebimentoDia}`}
            color={COLORS.cyan}
          />
        </div>

        <div style={styles.gridTop}>
          <Panel title="RECEBIMENTOS VS PAGAMENTOS">
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={ultimosDias.map((d) => ({
                    ...d,
                    data: formatarDataCurta(d.data),
                  }))}
                >
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="data" stroke={COLORS.muted} tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke={COLORS.muted}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatK(v)}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={styles.tooltip}
                  />
                  <Legend />
                  <Bar
                    dataKey="entradas"
                    fill={COLORS.green}
                    name="Recebimentos"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="saidas"
                    fill={COLORS.red}
                    name="Pagamentos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="COMPOSIÇÃO RECEBIMENTOS">
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={composicaoRecebimentos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {composicaoRecebimentos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={styles.tooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 6 }}>
              {composicaoRecebimentos.map((item, idx) => (
                <div key={idx} style={styles.legendItem}>
                  <div style={styles.legendLeft}>
                    <span
                      style={{
                        ...styles.legendDot,
                        background: item.color,
                      }}
                    />
                    <span style={{ color: COLORS.muted }}>{item.name}</span>
                  </div>
                  <span style={{ color: COLORS.text }}>
                    {Math.round((item.value / (totalEntradas || 1)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="SALDO ACUMULADO — LINHA DO TEMPO">
          <div style={styles.timelineWrap}>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={linhaSaldo}>
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="data" stroke={COLORS.muted} tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke={COLORS.muted}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatK(v)}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={styles.tooltip}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="realizado"
                    stroke={COLORS.blue}
                    strokeWidth={3}
                    dot={{ r: 2 }}
                    connectNulls={false}
                    name="Realizado"
                  />
                  <Line
                    type="monotone"
                    dataKey="projecao"
                    stroke={COLORS.yellow}
                    strokeWidth={3}
                    dot={{ r: 2 }}
                    strokeDasharray="6 6"
                    connectNulls
                    name="Projeção"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>

        <Panel title="VISÃO DIÁRIA DETALHADA — HORIZONTAL">
          <div style={{ overflowX: "auto" }}>
            <table style={styles.matrixTable}>
              <thead>
                <tr>
                  <th style={styles.matrixHead}>Indicador</th>
                  {tabelaHorizontal.datas.map((data, idx) => (
                    <th key={idx} style={styles.matrixHead}>
                      {data}
                    </th>
                  ))}
                  <th style={styles.matrixHead}>Total</th>
                </tr>
              </thead>
              <tbody>
                <MatrixRow
                  label="Recebimentos"
                  values={tabelaHorizontal.recebimentos}
                  total={tabelaHorizontal.recebimentos.reduce((a, b) => a + b, 0)}
                  color={COLORS.green}
                />
                <MatrixRow
                  label="Pagamentos"
                  values={tabelaHorizontal.pagamentos}
                  total={tabelaHorizontal.pagamentos.reduce((a, b) => a + b, 0)}
                  color={COLORS.red}
                />
                <MatrixRow
                  label="Saldo do dia"
                  values={tabelaHorizontal.saldoDia}
                  total={tabelaHorizontal.saldoDia.reduce((a, b) => a + b, 0)}
                  color="white"
                  dynamic
                />
                <MatrixRow
                  label="Saldo acumulado"
                  values={tabelaHorizontal.saldoAcumulado}
                  total={saldoFinal}
                  color="white"
                  dynamic
                />
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function MetricCard({ title, value, helper, color }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        border: `1px solid ${COLORS.border}`,
        borderTop: `2px solid ${color}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: "0.14em" }}>
        {title}
      </div>
      <div
        style={{
          color,
          fontSize: 22,
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        {value}
      </div>
      <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 6 }}>
        {helper}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          color: COLORS.muted,
          fontSize: 11,
          letterSpacing: "0.14em",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? COLORS.blue : COLORS.border}`,
        background: active ? COLORS.blue : "transparent",
        color: "white",
        fontSize: 11,
        marginRight: 6,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function MenuItem({ children, active = false }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        color: active ? "white" : COLORS.muted,
        background: active ? "rgba(30,180,255,0.12)" : "transparent",
        border: active ? `1px solid ${COLORS.border}` : "1px solid transparent",
        marginBottom: 6,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

function InfoBox({ title, text }) {
  return (
    <div style={styles.infoBox}>
      <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ color: COLORS.muted, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function MatrixRow({ label, values, total, color, dynamic = false }) {
  return (
    <tr>
      <td style={styles.matrixCellLabel}>{label}</td>
      {values.map((v, idx) => (
        <td
          key={idx}
          style={{
            ...styles.matrixCell,
            color: dynamic ? (v >= 0 ? "#ffffff" : COLORS.red) : color,
          }}
        >
          {v === 0 ? "-" : moneyShort(v)}
        </td>
      ))}
      <td
        style={{
          ...styles.matrixCell,
          color: dynamic ? (total >= 0 ? "#ffffff" : COLORS.red) : color,
          fontWeight: 700,
        }}
      >
        {moneyShort(total)}
      </td>
    </tr>
  );
}

function formatarDataCurta(data) {
  if (!data) return "-";
  const partes = String(data).split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`;
  }
  return data;
}

function formatK(valor) {
  if (Math.abs(valor) >= 1000) {
    return `R$${Math.round(valor / 1000)}k`;
  }
  return `R$${valor}`;
}

function moneyShort(valor) {
  return (valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #07111b, #091420 45%, #08131f)",
    color: COLORS.text,
    display: "grid",
    gridTemplateColumns: "160px 1fr",
  },
  sidebar: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    borderRight: `1px solid ${COLORS.border}`,
    padding: 18,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  logoSub: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: "0.2em",
    marginTop: 4,
    marginBottom: 24,
  },
  sideLabel: {
    fontSize: 10,
    letterSpacing: "0.18em",
    color: COLORS.muted,
    marginBottom: 10,
    marginTop: 18,
  },
  clientCard: {
    background: "rgba(30,180,255,0.08)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  clientName: {
    fontWeight: 700,
    fontSize: 16,
  },
  sideFooter: {
    marginTop: 24,
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 14,
  },
  sideFooterTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  sideFooterText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },
  main: {
    padding: 20,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
    alignItems: "center",
    flexWrap: "wrap",
  },
  search: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: "10px 14px",
    borderRadius: 12,
    minWidth: 280,
  },
  topbarBadges: {
    display: "flex",
    gap: 8,
  },
  topbarBadge: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 11,
    color: COLORS.text,
  },
  headerRow: {
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 34,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 16,
  },
  gridTop: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  timelineWrap: {
    borderRadius: 16,
    padding: 10,
    background:
      "linear-gradient(180deg, rgba(30,180,255,0.12), rgba(30,180,255,0.03))",
  },
  tooltip: {
    backgroundColor: "#0b1220",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
  },
  legendItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    fontSize: 13,
  },
  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
  },
  matrixTable: {
    borderCollapse: "collapse",
    width: "100%",
    minWidth: "1200px",
  },
  matrixHead: {
    padding: "10px",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
  },
  matrixCellLabel: {
    padding: "10px",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
  },
  matrixCell: {
    padding: "10px",
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: 13,
    textAlign: "center",
  },
  loginWrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top left, rgba(30,180,255,0.15), transparent 30%), linear-gradient(180deg, #07111b, #091420 45%, #08131f)",
    position: "relative",
    overflow: "hidden",
  },
  loginGlow: {
    position: "absolute",
    left: -120,
    top: -80,
    width: 320,
    height: 320,
    background: "rgba(30,180,255,0.15)",
    filter: "blur(80px)",
    borderRadius: "50%",
  },
  loginCard: {
    width: 880,
    maxWidth: "92vw",
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 28,
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    overflow: "hidden",
    boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
    zIndex: 2,
  },
  loginLeft: {
    padding: 34,
    background:
      "linear-gradient(180deg, rgba(30,180,255,0.10), rgba(255,255,255,0.01))",
  },
  loginRight: {
    padding: 34,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 14,
  },
  loginText: {
    color: COLORS.muted,
    lineHeight: 1.8,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: "0.18em",
    marginBottom: 10,
  },
  loginFormTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
  },
  label: {
    display: "block",
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0d1a29",
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: "12px 14px",
    borderRadius: 12,
  },
  primaryButton: {
    width: "100%",
    marginTop: 18,
    background: COLORS.blue,
    color: "#fff",
    border: "none",
    padding: "14px 18px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  loginObs: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.7,
    marginTop: 16,
  },
  infoBox: {
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.02)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
};
