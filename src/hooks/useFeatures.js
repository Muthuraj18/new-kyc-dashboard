import { useEffect, useState } from 'react';
import api from '../api';

// Which optional dashboard features the connected database supports
// (Trash needs deleted_client_records, Audit Logs needs audit_logs).
// Fetched once and shared by every component that asks.
let featuresPromise = null;

export default function useFeatures() {
  const [features, setFeatures] = useState({ auditLogs: false, trash: false });

  useEffect(() => {
    if (!featuresPromise) {
      featuresPromise = api.get('/features').then(({ data }) => data).catch(() => {
        featuresPromise = null;
        return { auditLogs: false, trash: false };
      });
    }
    let active = true;
    featuresPromise.then((data) => { if (active) setFeatures(data); });
    return () => { active = false; };
  }, []);

  return features;
}
