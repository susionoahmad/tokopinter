# Security Specification & Threat Model

This document outlines the security invariants, access control structures, and threat models for the cloud database synchronization feature using Firestore.

## 1. Data Invariants & Access Controls
- **Owner Isoaltion**: A user `{userId}` can only read, write, update, or delete documents inside `/users/{userId}` or its subcollections (`products` and `transactions`). Any document outside their own user namespace must return `PERMISSION_DENIED`.
- **Verified Authentication**: Standard writes are only permitted for accounts that are logged in.
- **Data Shape Integrity**: All fields must strictly correspond to the `firebase-blueprint.json` schema. Key changes on updates are strictly guarded using `affectedKeys()`.

## 2. The "Dirty Dozen" Threat Payloads (Test Scenarios)
Here are 12 high-impact attack vectors designed to breach security limits, and how our firestore rules prevent them:

1. **Spoofed User Registration**: Malicious user writes to `/users/attackerId` trying to register someone else's email.
2. **Cross-User Product Scraping**: Attacker tries to query `/users/victimUserId/products` to spy on inventory.
3. **Cross-User Transaction Hijacking**: Attacker tries to inject or view sale transactions under another user's path.
4. **Negative Stock Insertion**: Malicious client submits a negative stock value for a product (`stock = -100`).
5. **Zero Price Product Fraud**: Customer/employee alters product price to `0` or negative in the products collection.
6. **Phantom Fields Injection (Update-Gap)**: User tries to inject a `role: 'admin'` or `isPremium: true` field into a product or user document.
7. **Timestamp Spoofing**: Client attempts to provide arbitrary historical timestamp for custom transactions, bypassing `request.time`.
8. **Negative Profit Fraud**: Inserting fake transaction records where `profit` is higher than `totalPrice - totalCost`.
9. **Unsecured Query Listing**: Issuing a broad query `/users/{someUser}/transactions` without specifying the user ID in the query filter.
10. **ID Poisoning Attack**: Attempting to create a product document with an extremely long 1.5MB junk-character string ID.
11. **Immutability Breach**: Attempting to alter `id` or `timestamp` fields during product/transaction update.
12. **Out of Range Payment Method**: Attempting to save a transaction with payMethod `Bitcoin` when only `Tunai`, `QRIS`, or `Kartu` are permitted.

Our custom `firestore.rules` will explicitly block all 12 scenarios.
