import { useState, useEffect } from "react";

const FIPE_BASE_URL = "https://parallelum.com.br/fipe/api/v1";

export interface FipeBrand {
  codigo: string;
  nome: string;
}

export interface FipeModel {
  codigo: number;
  nome: string;
}

export interface FipeYear {
  codigo: string;
  nome: string;
}

export interface FipeVehicle {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

export function useFipeBrands() {
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrands() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${FIPE_BASE_URL}/carros/marcas`);
        if (!response.ok) throw new Error("Erro ao buscar marcas");
        const data = await response.json();
        setBrands(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchBrands();
  }, []);

  return { brands, loading, error };
}

export function useFipeModels(brandCode: string | null) {
  const [models, setModels] = useState<FipeModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandCode) {
      setModels([]);
      return;
    }

    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${FIPE_BASE_URL}/carros/marcas/${brandCode}/modelos`);
        if (!response.ok) throw new Error("Erro ao buscar modelos");
        const data = await response.json();
        setModels(data.modelos || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [brandCode]);

  return { models, loading, error };
}

export function useFipeYears(brandCode: string | null, modelCode: string | null) {
  const [years, setYears] = useState<FipeYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandCode || !modelCode) {
      setYears([]);
      return;
    }

    async function fetchYears() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${FIPE_BASE_URL}/carros/marcas/${brandCode}/modelos/${modelCode}/anos`);
        if (!response.ok) throw new Error("Erro ao buscar anos");
        const data = await response.json();
        setYears(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchYears();
  }, [brandCode, modelCode]);

  return { years, loading, error };
}

export async function getFipeVehicleDetails(
  brandCode: string,
  modelCode: string,
  yearCode: string
): Promise<FipeVehicle | null> {
  try {
    const response = await fetch(
      `${FIPE_BASE_URL}/carros/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`
    );
    if (!response.ok) throw new Error("Erro ao buscar detalhes do veículo");
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Erro ao buscar detalhes:", err);
    return null;
  }
}
