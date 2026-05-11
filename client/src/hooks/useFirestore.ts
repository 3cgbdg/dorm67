import { useEffect, useState } from "react";
import {
  type Query,
  type DocumentData,
  onSnapshot,
  query,
} from "firebase/firestore";

export function useCollectionListener<T = DocumentData>(source: Query) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(source);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [source]);

  return { data, loading, error };
}
