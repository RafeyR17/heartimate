-- Revoke execute from public for idempotency RPCs
revoke execute on function public.claim_chat_idempotency(text, text, text, integer) from public;
revoke execute on function public.complete_chat_idempotency(text, text, text, jsonb) from public;
revoke execute on function public.fail_chat_idempotency(text, text) from public;
