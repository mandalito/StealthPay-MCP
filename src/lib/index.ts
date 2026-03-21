// Barrel export for all library functions
// Used by external consumers (e.g., StealthPay-Platform)

export { generateStealthAddress, checkStealthAddress, deriveStealthPrivateKey } from './stealth.js';
export type { StealthAddressResult, DerivedStealthKey } from './stealth.js';

export { getPaymentProfile, getStealthMetaAddress } from './ens.js';
export type { PaymentProfile } from './ens.js';

export { registerEnsName, registerStealthKeys } from './ens-register.js';
export type { RegisterNameParams, RegisterNameResult, RegisterStealthKeysResult } from './ens-register.js';

export { scanAnnouncements } from './scanner.js';
export type { StealthPayment, ScanParams } from './scanner.js';

export { sendToStealth, sendStablecoin, createPaymentLink } from './payments.js';

export { withdrawFromStealth } from './withdraw.js';
export type { WithdrawParams, WithdrawResult } from './withdraw.js';
