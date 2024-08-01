export interface Chat {
  id: string;
  name: string;
  messages: any[];
}

export enum ChatType {
  None = -1,
  Private,
  Public
}
