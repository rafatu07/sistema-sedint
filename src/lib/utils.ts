import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte uma data para string no formato YYYY-MM-DD mantendo o fuso horário local
 * Evita o problema de conversão UTC que pode resultar no dia anterior
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtém a data atual formatada para input de data (YYYY-MM-DD) 
 * mantendo o fuso horário local
 */
export function getTodayForInput(): string {
  return formatDateForInput(new Date())
}

/**
 * Cria um objeto Date a partir de uma string no formato YYYY-MM-DD
 * sem problemas de fuso horário UTC
 */
export function createDateFromString(dateString: string): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month é 0-indexed
}