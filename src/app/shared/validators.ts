import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').replace(/\D/g, '');

    if (!value) return null; // campo vazio: deixa o Validators.required tratar

    if (value.length !== 11) return { cpfInvalido: true };

    // Rejeita sequências com todos os dígitos iguais (000...000, 111...111, etc.)
    if (/^(\d)\1{10}$/.test(value)) return { cpfInvalido: true };

    // Valida primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(value[i]) * (10 - i);
    const dig1 = (soma % 11) < 2 ? 0 : 11 - (soma % 11);
    if (parseInt(value[9]) !== dig1) return { cpfInvalido: true };

    // Valida segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(value[i]) * (11 - i);
    const dig2 = (soma % 11) < 2 ? 0 : 11 - (soma % 11);
    if (parseInt(value[10]) !== dig2) return { cpfInvalido: true };

    return null;
  };
}

/** Impede datas futuras em campos do tipo date (valor 'YYYY-MM-DD') */
export function dataMaxHojeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    // Parseia como data local para evitar offset de fuso horário
    const [ano, mes, dia] = (control.value as string).split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    return data > hoje ? { dataFutura: true } : null;
  };
}

/** Formata string de dígitos como CPF: 000.000.000-00 */
export function formatarCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
