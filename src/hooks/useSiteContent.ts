import { useEffect, useState } from 'react';
import * as db from '../lib/db';
import type { AreaAtuacao, Depoimento } from '../types/database';

export function useConteudoSite() {
  const [conteudo, setConteudo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getConteudoSite()
      .then((map) => {
        setConteudo(map);
        setLoading(false);
      })
      .catch((e) => {
        console.error('useConteudoSite:', e);
        setLoading(false);
      });
  }, []);

  return { conteudo, loading };
}

export function useAreasAtuacao() {
  const [areas, setAreas] = useState<AreaAtuacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.listAreasAtuacao(true)
      .then((a) => {
        setAreas(a);
        setLoading(false);
      })
      .catch((e) => {
        console.error('useAreasAtuacao:', e);
        setLoading(false);
      });
  }, []);

  return { areas, loading };
}

export function useDepoimentos() {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.listDepoimentos(true)
      .then((d) => {
        setDepoimentos(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error('useDepoimentos:', e);
        setLoading(false);
      });
  }, []);

  return { depoimentos, loading };
}
