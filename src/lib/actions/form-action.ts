/**
 * O React tipa `form action` como uma função que retorna `void`.
 * Algumas server actions deste projeto retornam mensagens internas de sucesso/erro.
 * Este helper preserva a função original e apenas ajusta o contrato TypeScript do formulário.
 */
export type FormAction = (formData: FormData) => void | Promise<void>;

export function asFormAction(action: (formData: FormData) => unknown | Promise<unknown>): FormAction {
  return action as FormAction;
}
