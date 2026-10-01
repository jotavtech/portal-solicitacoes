import { useEffect, useState } from 'react';
import type { InternalRequest } from '@portal/contracts';
import { api, messageOf } from './api.js';
export function useRequest(id: string | undefined) {
  const [row, setRow] = useState<InternalRequest>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .detail(id ?? '')
      .then((value) => {
        if (active) setRow(value);
      })
      .catch((error) => {
        if (active) setError(messageOf(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  return { row, setRow, loading, error, retry: () => setRetry((value) => value + 1) };
}
