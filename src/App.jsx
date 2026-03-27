import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  AlertCircle,
  Lock,
  User,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  Clock3,
  FileBarChart2,
} from "lucide-react";

const theme = {
  bg: "#08131f",
  panel: "#0d1b2a",
  panel2: "#102132",
  border: "rgba(120,160,200,0.18)",
  softBorder: "rgba(120,160,200,0.12)",
  text: "#e8f0f7",
  muted: "#7d94aa",
  brand: "#11b5ff",
  green: "#1fd2a1",
  red: "#ff5d5d",
  yellow: "#ffd166",
};

const globalData = [
  { date: "07/03", fullDate: "07/03/2026", dia: "Sáb", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -45134, tipo: "realizado" },
  { date: "08/03", fullDate: "08/03/2026", dia: "Dom", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -45134, tipo: "realizado" },
  { date: "09/03", fullDate: "09/03/2026", dia: "Seg", recebimentos: 160, pagamentos: 23, saldoDia: 137, saldoAcum: -44997, tipo: "realizado" },
  { date: "10/03", fullDate: "10/03/2026", dia: "Ter", recebimentos: 8103, pagamentos: 19083, saldoDia: -10980, saldoAcum: -55977, tipo: "realizado" },
  { date: "11/03", fullDate: "11/03/2026", dia: "Qua", recebimentos: 79, pagamentos: 312, saldoDia: -233, saldoAcum: -56210, tipo: "realizado" },
  { date: "12/03", fullDate: "12/03/2026", dia: "Qui", recebimentos: 0, pagamentos: 13, saldoDia: -13, saldoAcum: -56223, tipo: "realizado" },
  { date: "13/03", fullDate: "13/03/2026", dia: "Sex", recebimentos: 23634, pagamentos: 0, saldoDia: 23634, saldoAcum: -32589, tipo: "realizado" },
  { date: "14/03", fullDate: "14/03/2026", dia: "Sáb", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -32589, tipo: "realizado" },
  { date: "15/03", fullDate: "15/03/2026", dia: "Dom", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -32589, tipo: "realizado" },
  { date: "16/03", fullDate: "16/03/2026", dia: "Seg", recebimentos: 35581, pagamentos: 21425, saldoDia: 14156, saldoAcum: -18433, tipo: "realizado" },
  { date: "17/03", fullDate: "17/03/2026", dia: "Ter", recebimentos: 0, pagamentos: 14, saldoDia: -14, saldoAcum: -18447, tipo: "realizado" },
  { date: "18/03", fullDate: "18/03/2026", dia: "Qua", recebimentos: 1478, pagamentos: 0, saldoDia: 1478, saldoAcum: -16969, tipo: "realizado" },
  { date: "19/03", fullDate: "19/03/2026", dia: "Qui", recebimentos: 0, pagamentos: 20401, saldoDia: -20401, saldoAcum: -37370, tipo: "realizado" },
  { date: "20/03", fullDate: "20/03/2026", dia: "Sex", recebimentos: 9300, pagamentos: 313, saldoDia: 8987, saldoAcum: -28383, tipo: "projecao" },
  { date: "21/03", fullDate: "21/03/2026", dia: "Sáb", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -28383, tipo: "projecao" },
  { date: "22/03", fullDate: "22/03/2026", dia: "Dom", recebimentos: 0, pagamentos: 0, saldoDia: 0, saldoAcum: -28383, tipo: "projecao" },
  { date: "23/03", fullDate: "23/03/2026", dia: "Seg", recebimentos: 11800, pagamentos: 620, saldoDia: 11180, saldoAcum: -17203, tipo: "projecao" },
  { date: "24/03", fullDate: "24/03/2026", dia: "Ter", recebimentos: 5600, pagamentos: 3100, saldoDia: 2500, saldoAcum: -14703, tipo: "projecao" },
];

function splitCompany(data, ratio) {
  let running = Math.round(data[0].saldoAcum * ratio);
  return data.map((d, idx) => {
    const recebimentos = Math.round(d.recebimentos * ratio);
    const pagamentos = Math.round(d.pagamentos * ratio);
    const saldoDia = recebimentos - pagamentos;
    if (idx === 0) running = Math.round(d.saldoAcum * ratio);
    else running += saldoDia;
    return { ...d, recebimentos, pagamentos, saldoDia, saldoAcum: running };
  });
}

const greenerData = splitCompany(globalData, 0.58);
const greendexData = splitCompany(globalData, 0.42);

function brl(v, decimals = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v || 0);
}

function compact(v) {
  const abs = Math.abs(v || 0);
  if (abs >= 1000) return `R$${Math.round(v / 1000)}k`;
  return `R$${v}`;
}

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function StatCard({ title, value, helper, accent, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="stat-row">
          <div>
            <div className="eyebrow">{title}</div>
            <div className="stat-value" style={{ color: accent }}>{value}</div>
            <div className="helper">{helper}</div>
          </div>
          <div className="icon-badge" style={{ background: `${accent}18`, color: accent }}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt}
          className={`seg-btn ${value === opt ? "active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MenuButton({ active, icon, label, onClick }) {
  return (
    <button className={`menu-btn ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HorizontalRow({ label, values, total, color, colorDynamic }) {
  return (
    <tr>
      <td className="row-label">{label}</td>
      {values.map((v, idx) => {
        const styleColor = colorDynamic ? (v >= 0 ? theme.text : theme.red) : color;
        return (
          <td key={`${label}-${idx}`} className="row-value" style={{ color: styleColor }}>
            {v === 0 ? "-" : brl(v, 2)}
          </td>
        );
      })}
      <td className="row-value total" style={{ color: colorDynamic ? (total >= 0 ? theme.text : theme.red) : color }}>
        {brl(total, 2)}
      </td>
    </tr>
  );
}

function DashboardFluxo({ company }) {
  const data =
    company === "Global" ? globalData : company === "Greener" ? greenerData : greendexData;

  const totals = useMemo(() => {
    const recebimentos = data.reduce((s, d) => s + d.recebimentos, 0);
    const pagamentos = data.reduce((s, d) => s + d.pagamentos, 0);
    const saldoFinal = data[data.length - 1]?.saldoAcum || 0;
    const melhor = Math.max(...data.map((d) => d.recebimentos));
    const melhorDia = data.find((d) => d.recebimentos === melhor);
    return { recebimentos, pagamentos, saldoFinal, melhorDia };
  }, [data]);

  const pieData = [
    { name: "Operacionais/Vendas", value: Math.round(totals.recebimentos * 0.60), color: "#11b5ff" },
    { name: "Aportes", value: Math.round(totals.recebimentos * 0.22), color: "#24c7b2" },
    { name: "Não operacionais", value: Math.round(totals.recebimentos * 0.10), color: "#ffd166" },
    { name: "Movimentações", value: Math.round(totals.recebimentos * 0.08), color: "#ff5d5d" },
  ];

  const timeline = data.map((d) => ({
    date: d.date,
    saldoRealizado: d.tipo === "realizado" ? d.saldoAcum : null,
    saldoProjecao: d.tipo === "projecao" ? d.saldoAcum : null,
  }));

  return (
    <div className="page-block">
      <div className="page-header">
        <div>
          <div className="title-row">
            <h1>Fluxo de Caixa</h1>
            <span>Mar 2026</span>
          </div>
          <p>Visão diária com realizado e projeção, desenhada para a futura plataforma da GPSBI.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Recebimentos Totais" value={brl(totals.recebimentos, 2)} helper="no período" accent={theme.green} icon={<TrendingUp size={20} />} />
        <StatCard title="Pagamentos Totais" value={brl(totals.pagamentos, 2)} helper="no período" accent={theme.red} icon={<TrendingDown size={20} />} />
        <StatCard title="Saldo Final Banco" value={brl(totals.saldoFinal, 2)} helper="acumulado" accent={theme.red} icon={<Wallet size={20} />} />
        <StatCard title="Melhor Recebimento" value={brl(totals.melhorDia?.recebimentos || 0, 2)} helper={totals.melhorDia ? `dia ${totals.melhorDia.fullDate}` : "-"} accent={theme.text} icon={<BarChart3 size={20} />} />
      </div>

      <div className="chart-grid">
        <Card className="span-2">
          <div className="card-title-row">
            <div className="eyebrow">Recebimentos vs Pagamentos</div>
            <div className="legend">
              <span><i style={{ background: theme.green }} />Recebimentos</span>
              <span><i style={{ background: theme.red }} />Pagamentos</span>
            </div>
          </div>
          <div className="chart-290">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: theme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={{ fill: theme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f1d2c", border: `1px solid ${theme.border}`, borderRadius: 16, color: theme.text }} formatter={(v) => brl(Number(v), 2)} />
                <Bar dataKey="recebimentos" fill={theme.green} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pagamentos" fill={theme.red} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="eyebrow mb-16">Composição Recebimentos</div>
          <div className="chart-240">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={2}>
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f1d2c", border: `1px solid ${theme.border}`, borderRadius: 16, color: theme.text }} formatter={(v) => brl(Number(v), 2)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="list">
            {pieData.map((item) => (
              <div key={item.name} className="list-item">
                <div className="list-name"><i style={{ background: item.color }} />{item.name}</div>
                <div>{Math.round((item.value / totals.recebimentos) * 100)}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-title-row">
          <div className="eyebrow">Saldo Acumulado — Linha do Tempo</div>
          <div className="legend">
            <span><i style={{ background: theme.brand }} />Realizado</span>
            <span><i style={{ background: theme.yellow }} />Projeção</span>
          </div>
        </div>
        <div className="chart-wrap-blue">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="realFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#11b5ff" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#11b5ff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd166" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#ffd166" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: theme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compact} tick={{ fill: theme.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f1d2c", border: `1px solid ${theme.border}`, borderRadius: 16, color: theme.text }} formatter={(v) => brl(Number(v), 2)} />
              <Area type="monotone" dataKey="saldoRealizado" stroke={theme.brand} fill="url(#realFill)" strokeWidth={3} />
              <Line type="monotone" dataKey="saldoRealizado" stroke={theme.brand} strokeWidth={2.5} dot={{ r: 2, fill: theme.brand }} connectNulls={false} />
              <Area type="monotone" dataKey="saldoProjecao" stroke={theme.yellow} fill="url(#projFill)" strokeWidth={3} />
              <Line type="monotone" dataKey="saldoProjecao" stroke={theme.yellow} strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 2, fill: theme.yellow }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="eyebrow mb-16">Visão diária detalhada — horizontal</div>
        <div className="table-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Indicador</th>
                {data.map((row) => (
                  <th key={row.fullDate}>
                    <div>{row.fullDate}</div>
                    <small>{row.dia}</small>
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <HorizontalRow label="Recebimentos" values={data.map((d) => d.recebimentos)} total={totals.recebimentos} color={theme.green} />
              <HorizontalRow label="Pagamentos" values={data.map((d) => d.pagamentos)} total={totals.pagamentos} color={theme.red} />
              <HorizontalRow label="Saldo do dia" values={data.map((d) => d.saldoDia)} total={data.reduce((s, d) => s + d.saldoDia, 0)} colorDynamic />
              <HorizontalRow label="Saldo acumulado" values={data.map((d) => d.saldoAcum)} total={totals.saldoFinal} colorDynamic />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PlaceholderPage({ title, subtitle, cards }) {
  return (
    <div className="page-block">
      <div>
        <h1>{title}</h1>
        <p className="sub">{subtitle}</p>
      </div>
      <div className="stats-grid">
        {cards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} helper={card.helper} accent={card.accent} icon={card.icon} />
        ))}
      </div>
      <Card>
        <div className="placeholder-title">Próxima evolução desta tela</div>
        <div className="placeholder-text">
          Esta seção já foi desenhada como parte da plataforma GPSBI. No próximo ciclo, conectamos dados reais, filtros, análise executiva automática e permissões por cliente.
        </div>
      </Card>
    </div>
  );
}

function HomePage({ setPage }) {
  return (
    <div className="page-block">
      <div>
        <h1>Home Executiva</h1>
        <p className="sub">Entrada principal da futura plataforma GPSBI, com leitura consolidada e atalhos para cada frente do cliente.</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Saúde do caixa" value="Atenção" helper="saldo final ainda negativo" accent={theme.yellow} icon={<Wallet size={20} />} />
        <StatCard title="Recebimentos do mês" value={brl(globalData.reduce((s, d) => s + d.recebimentos, 0), 0)} helper="visão consolidada" accent={theme.green} icon={<TrendingUp size={20} />} />
        <StatCard title="Clientes em atraso" value="12" helper="prioridade comercial/financeira" accent={theme.red} icon={<AlertCircle size={20} />} />
        <StatCard title="Dashboards ativos" value="4" helper="fluxo, DRE, comercial e inadimplência" accent={theme.brand} icon={<LayoutDashboard size={20} />} />
      </div>

      <div className="home-grid">
        <Card className="span-2">
          <div className="placeholder-title">Próximos blocos da plataforma</div>
          <div className="block-grid">
            {[
              ["Login real", "Usuário, senha, sessão, permissões e recuperação de acesso."],
              ["Base multicliente", "Uma estrutura para vários clientes em um mesmo ambiente."],
              ["Conexão com API/Sheets", "Leitura automática das bases geradas pela operação."],
              ["Camada consultiva", "Textos executivos automáticos com leitura do cenário."],
            ].map(([t, s]) => (
              <div key={t} className="mini-card">
                <div className="mini-title">{t}</div>
                <div className="mini-text">{s}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="placeholder-title">Atalhos rápidos</div>
          <div className="quick-list">
            {[
              ["Abrir Fluxo de Caixa", "fluxo"],
              ["Abrir DRE Projetada", "dre"],
              ["Abrir Comercial", "comercial"],
              ["Abrir Inadimplência", "inadimplencia"],
            ].map(([label, key]) => (
              <button key={label} className="quick-btn" onClick={() => setPage(key)}>
                <span>{label}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  return (
    <div className="login-screen">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="login-shell">
        <div className="login-left">
          <div className="brand-main">GPSBI Platform</div>
          <div className="brand-sub">
            Protótipo da futura plataforma própria da GPSBI, com acesso seguro, experiência premium e visão executiva para cada cliente.
          </div>

          <div className="feature-list">
            <Feature icon={<Lock size={20} />} title="Ambiente com acesso protegido" text="Base pronta para evoluir para login por cliente, sessão e permissões." />
            <Feature icon={<Building2 size={20} />} title="Multiempresa e multicliente" text="Estrutura pensada para Greener, Greendex e futuros clientes em uma mesma plataforma." />
            <Feature icon={<ShieldCheck size={20} />} title="Experiência premium GPSBI" text="Mais valor percebido, mais encantamento e menos dependência de ferramentas de terceiros." />
          </div>
        </div>

        <div className="login-right">
          <div className="eyebrow">Acesso do cliente</div>
          <div className="login-title">Entrar na plataforma</div>

          <div className="form-group">
            <label>E-mail</label>
            <div className="input-shell">
              <User size={16} />
              <input defaultValue="cliente@gpsbi.com.br" />
            </div>
          </div>

          <div className="form-group">
            <label>Senha</label>
            <div className="input-shell">
              <Lock size={16} />
              <input type="password" defaultValue="12345678" />
            </div>
          </div>

          <button className="primary-btn" onClick={onLogin}>Entrar</button>

          <div className="login-note">
            Nesta fase é um protótipo visual. Na próxima evolução, conectamos autenticação real, banco de usuários e controle de acesso por cliente.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-head">
        <div className="feature-icon">{icon}</div>
        <div className="feature-title">{title}</div>
      </div>
      <div className="feature-text">{text}</div>
    </div>
  );
}

export default function App() {
  const [logged, setLogged] = useState(false);
  const [company, setCompany] = useState("Global");
  const [page, setPage] = useState("fluxo");

  if (!logged) return <LoginPage onLogin={() => setLogged(true)} />;

  const pages = [
    { key: "home", label: "Home Executiva", icon: <LayoutDashboard size={16} /> },
    { key: "fluxo", label: "Fluxo de Caixa", icon: <Wallet size={16} /> },
    { key: "dre", label: "DRE Projetada", icon: <FileBarChart2 size={16} /> },
    { key: "comercial", label: "Comercial", icon: <BarChart3 size={16} /> },
    { key: "inadimplencia", label: "Inadimplência", icon: <AlertCircle size={16} /> },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="logo">GPSBI</div>
          <div className="logo-sub">CONSULTORIA</div>
        </div>

        <div className="client-card">
          <div className="eyebrow">Cliente ativo</div>
          <div className="client-name">Grupo Greener</div>
          <div className="mt-16">
            <Segmented value={company} onChange={setCompany} options={["Global", "Greener", "Greendex"]} />
          </div>
        </div>

        <div className="menu-label">Menu</div>
        <div className="menu-list">
          {pages.map((item) => (
            <MenuButton key={item.key} active={page === item.key} icon={item.icon} label={item.label} onClick={() => setPage(item.key)} />
          ))}
        </div>

        <Card className="sidebar-card">
          <div className="mini-title">Visão da plataforma</div>
          <div className="mini-text">
            O objetivo aqui é transformar a GPSBI em uma experiência própria, segura e encantadora para o cliente final.
          </div>
        </Card>
      </aside>

      <main className="main-area">
        <div className="topbar">
          <div className="search-shell">
            <Search size={16} />
            <input defaultValue="Buscar cliente, indicador ou página" />
          </div>

          <div className="top-badges">
            <div className="badge badge-blue">Ambiente protótipo</div>
            <div className="badge"><Clock3 size={14} /> Atualizado agora</div>
          </div>
        </div>

        {page === "home" && <HomePage setPage={setPage} />}
        {page === "fluxo" && <DashboardFluxo company={company} />}
        {page === "dre" && (
          <PlaceholderPage
            title="DRE Projetada"
            subtitle="Página já encaixada na arquitetura da plataforma. Depois conectamos receita, custos, despesas e resultado por período e empresa."
            cards={[
              { title: "Receita", value: brl(485000, 0), helper: "mês atual", accent: theme.green, icon: <TrendingUp size={20} /> },
              { title: "Margem", value: "27,4%", helper: "projeção", accent: theme.brand, icon: <BarChart3 size={20} /> },
              { title: "Resultado", value: brl(58300, 0), helper: "lucro projetado", accent: theme.yellow, icon: <Wallet size={20} /> },
              { title: "Farol", value: "Atenção", helper: "despesas fixas elevadas", accent: theme.red, icon: <AlertCircle size={20} /> },
            ]}
          />
        )}
        {page === "comercial" && (
          <PlaceholderPage
            title="Comercial"
            subtitle="Espaço desenhado para faturamento, meta, conversão, mix, representantes e leitura consultiva por período."
            cards={[
              { title: "Faturamento", value: brl(1280000, 0), helper: "mês", accent: theme.green, icon: <TrendingUp size={20} /> },
              { title: "Meta", value: "94%", helper: "atingimento", accent: theme.brand, icon: <BarChart3 size={20} /> },
              { title: "Ticket médio", value: brl(1830, 0), helper: "por pedido", accent: theme.yellow, icon: <Wallet size={20} /> },
              { title: "Clientes ativos", value: "312", helper: "base atual", accent: theme.text, icon: <Building2 size={20} /> },
            ]}
          />
        )}
        {page === "inadimplencia" && (
          <PlaceholderPage
            title="Inadimplência"
            subtitle="Área preparada para aging list, top atrasos, régua de cobrança e acompanhamento por cliente, grupo e vendedor."
            cards={[
              { title: "Em aberto", value: brl(248000, 0), helper: "total vencido", accent: theme.red, icon: <AlertCircle size={20} /> },
              { title: "Top cliente", value: brl(48700, 0), helper: "maior exposição", accent: theme.yellow, icon: <Building2 size={20} /> },
              { title: "Prazo médio", value: "18 dias", helper: "atraso médio", accent: theme.brand, icon: <Clock3 size={20} /> },
              { title: "Cobranças ativas", value: "29", helper: "em andamento", accent: theme.text, icon: <ShieldCheck size={20} /> },
            ]}
          />
        )}
      </main>
    </div>
  );
}