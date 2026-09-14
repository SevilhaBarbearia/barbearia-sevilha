# Rollout seguro da nova interface

Este documento define o processo da migração visual Warm Premium sem alterar as regras SaaS existentes.

## Objetivo

A nova interface fica atrás de uma configuração runtime por tenant. A aplicação mantém a interface legada disponível durante o canary, permitindo retorno imediato sem novo deploy.

A chave usada no Global Config é:

```text
warmPremiumUiTenants