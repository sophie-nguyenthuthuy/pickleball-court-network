import { ApiEnv, ObservabilityEnv, PaymentsEnv, SmsEnv, StorageEnv, ZaloEnv } from '@pcn/config';

const Schema = ApiEnv.merge(ObservabilityEnv).merge(PaymentsEnv).merge(SmsEnv).merge(StorageEnv).merge(ZaloEnv);

export const env = Schema.parse(process.env);
export type Env = typeof env;
