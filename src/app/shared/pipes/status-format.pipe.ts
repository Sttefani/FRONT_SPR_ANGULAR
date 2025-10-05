import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusFormat', // Este é o nome que usaremos no HTML
  standalone: true
})
export class StatusFormatPipe implements PipeTransform {

  // Este é o nosso "dicionário" de tradução.
  // A chave (à esquerda) é o valor que vem da API.
  // O valor (à direita) é o texto que o usuário verá.
  private statusMap: { [key: string]: string } = {
    'AGUARDANDO_PERITO': 'Aguardando Perito',
    'EM_ANALISE': 'Em Análise',
    'FINALIZADA': 'Finalizada'
    // Se tiver outros status, adicione-os aqui.
  };

  transform(value: string): string {
    // Se o valor for nulo ou vazio, não faz nada.
    if (!value) {
      return '';
    }

    // Procura a tradução no dicionário.
    // Se encontrar, retorna a tradução.
    // Se não encontrar, retorna o valor original para não quebrar a tela.
    return this.statusMap[value] || value;
  }
}
