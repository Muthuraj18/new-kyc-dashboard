import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Layout from '../../components/Layout';
import { formatLabel } from '../../utils/format';

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };

function StatCard({ label, value, color, onClick, hint }) {
  return (
    <div
      className={`table-card${onClick ? ' nri-card-link' : ''}`}
      style={{ padding: 22 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      title={hint}
    >
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color }}>
        {value === null || value === undefined ? '...' : value}
      </div>
    </div>
  );
}

function Section({ title, children, note }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
        {title}
        {note && <span className="nri-section-note">{note}</span>}
      </h3>
      {children}
    </div>
  );
}

function ErrorCard({ text }) {
  return <div className="table-card" style={{ padding: 22, color: 'var(--danger)' }}>{text}</div>;
}

// Status (or stage) breakdown of one table, each value opening the filtered list.
function Breakdown({ data, onPick }) {
  if (!data?.values?.length) return null;
  return (
    <div style={{ ...gridStyle, marginTop: 16 }}>
      {data.values.map((v) => (
        <StatCard
          key={v.value}
          label={v.value === '(blank)' ? 'Not set' : formatLabel(v.value)}
          value={v.count}
          onClick={v.value === '(blank)' || !onPick ? undefined : () => onPick(v.value)}
        />
      ))}
    </div>
  );
}

function SubTitle({ children }) {
  return <div className="nri-subtitle">{children}</div>;
}

function AccountSection({ type, label, data, navigate }) {
  const open = (extra = {}) => navigate(`/nri/applications?${new URLSearchParams({ type, ...extra })}`);
  return (
    <Section title={`${label} Accounts`}>
      {data?.error ? <ErrorCard text={data.error} />
        : data && !data.exists ? <ErrorCard text={`Table nre_nro.${data.table} was not found`} />
          : (
            <>
              <div style={gridStyle}>
                <StatCard label={`Total ${label}`} value={data?.total} onClick={() => open()} />
                {data?.today !== undefined && <StatCard label="Today" value={data.today} />}
                {data?.last7 !== undefined && <StatCard label="Last 7 days" value={data.last7} />}
              </div>
              {data?.status?.values?.length > 0 && <SubTitle>Application status</SubTitle>}
              <Breakdown data={data?.status} onPick={(v) => open({ status: v })} />
              {data?.stages && (
                <>
                  <SubTitle>Application stage</SubTitle>
                  <div style={{ ...gridStyle, marginTop: 16 }}>
                    {data.stages.map((s) => (
                      <StatCard
                        key={s.value}
                        label={s.label}
                        value={s.count}
                        color={s.count && (s.value === 'esigned' || s.value === 'submitted') ? 'var(--success)' : undefined}
                        onClick={s.count ? () => open({ stage: s.value }) : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
    </Section>
  );
}

// application_status totals over NRE + NRO (in_progress / completed / abandoned).
const STATUS_ORDER = ['in_progress', 'completed', 'abandoned'];
const STATUS_COLOR = { completed: 'var(--success)', abandoned: 'var(--danger)' };
function combinedStatuses(...parts) {
  const counts = new Map();
  parts.forEach((p) => (p?.status?.values || []).forEach((v) => counts.set(v.value, (counts.get(v.value) || 0) + v.count)));
  STATUS_ORDER.forEach((s) => { if (parts.every((p) => p && !p.error) && !counts.has(s)) counts.set(s, 0); });
  return [...counts.entries()].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a[0]);
    const ib = STATUS_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b[1] - a[1];
  });
}

export default function NriDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/nri/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load the NRE - NRO dashboard'));
  }, []);

  const { nre, nro, ipv, boid } = data;
  const num = (x) => (x && !x.error && x.total !== undefined ? x.total : null);
  const totalApps = num(nre) !== null && num(nro) !== null ? num(nre) + num(nro) : null;

  return (
    <Layout title="NRI Dashboard">
      {error && <ErrorCard text={error} />}

      <div style={gridStyle}>
        <StatCard label="Total Applications" value={totalApps} onClick={() => navigate('/nri/applications')} />
        <StatCard label="NRE Accounts" value={num(nre)} onClick={() => navigate('/nri/applications?type=nre')} />
        <StatCard label="NRO Accounts" value={num(nro)} onClick={() => navigate('/nri/applications?type=nro')} />
        <StatCard label="IPV Sessions" value={num(ipv)} onClick={() => navigate('/nri/ipv')} />
      </div>

      {(nre?.status || nro?.status) && (
        <div style={{ ...gridStyle, marginTop: 16 }}>
          {combinedStatuses(nre, nro).map(([value, count]) => (
            <StatCard
              key={value}
              label={value === '(blank)' ? 'Status not set' : formatLabel(value)}
              value={count}
              color={STATUS_COLOR[value]}
              onClick={value === '(blank)' ? undefined : () => navigate(`/nri/applications?${new URLSearchParams({ status: value })}`)}
            />
          ))}
        </div>
      )}

      <AccountSection type="nre" label="NRE" data={nre} navigate={navigate} />
      <AccountSection type="nro" label="NRO" data={nro} navigate={navigate} />

      <Section title="IPV (Video Verification)">
        {ipv?.error ? <ErrorCard text={ipv.error} />
          : ipv && !ipv.exists ? <ErrorCard text={`Table nre_nro.${ipv.table} was not found`} />
            : (
              <>
                <div style={gridStyle}>
                  <StatCard label="Total IPV" value={ipv?.total} onClick={() => navigate('/nri/ipv')} />
                  {ipv?.today !== undefined && <StatCard label="Today" value={ipv.today} />}
                  {ipv?.last7 !== undefined && <StatCard label="Last 7 days" value={ipv.last7} />}
                </div>
                {ipv?.status?.values?.length > 0 && <SubTitle>Session status</SubTitle>}
                <Breakdown data={ipv?.status} onPick={(v) => navigate(`/nri/ipv?${new URLSearchParams({ status: v })}`)} />
              </>
            )}
      </Section>

      <Section title="BOID">
        {boid?.error ? <ErrorCard text={boid.error} />
          : boid && !boid.exists ? <ErrorCard text={`Table nre_nro.${boid.table} was not found`} />
            : (
              <div style={gridStyle}>
                <StatCard label="Total Accounts" value={boid?.total} onClick={() => navigate('/nri/boid')} />
                {boid?.used !== null && (
                  <StatCard label="Used" value={boid?.used} color="var(--danger)" onClick={() => navigate('/nri/boid?state=assigned')} />
                )}
                {boid?.available !== null && (
                  <StatCard label="Available" value={boid?.available} color="var(--success)" onClick={() => navigate('/nri/boid?state=available')} />
                )}
              </div>
            )}
      </Section>
    </Layout>
  );
}
