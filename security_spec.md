# Security Specification - Amar Supply

## Data Invariants
- **Identity Integrity**: A user's `role` and `permissions` are immutable by the user themselves. Only designated Admins can update these.
- **Relational Integrity**: Every `order` must reference a valid `customer` (enforced via `exists()`).
- **State Transition**: Orders cannot be modified once they reach a 'delivered' or 'cancelled' status (terminal state locking).
- **Audit Trails**: `activityLogs` are append-only. No deletion or updates allowed.
- **Access Control**: Module-level permissions in the `user.permissions` object strictly govern access to Firestore collections.

## The Dirty Dozen (Threat Model Payloads)

1. **The Self-Promotion**: `update users/user_1 { role: 'admin' }` (Target: Identity Spoofing)
2. **The Shadow Update**: `update users/user_2 { name: 'New Name', isAdmin: true }` (Target: Privilege Escalation)
3. **The Data Scraper**: `list users` (Target: PII Disclosure - emails/phones)
4. **The Ghost Order**: `create orders/order_99 { customerId: 'non_existent_id' }` (Target: Relational Sync Gap)
5. **The Time Traveler**: `create transactions/t_1 { createdAt: 2050-01-01 }` (Target: Temporal Integrity)
6. **The Log Burner**: `delete activityLogs/log_123` (Target: Audit Trail Destruction)
7. **The Resource Bomb**: `create inventory/p_1 { sku: 'A' * 1024 * 1024 }` (Target: Denial of Wallet/Resource Exhaustion)
8. **The PII Blanket**: `get customers/customer_1` (Target: Unauthorized PII Access)
9. **The Inactive Ghost**: Deactivated user calling `list products` (Target: Session/Status Integrity)
10. **The Update Gap**: `update orders/order_1 { totalAmount: 0 }` without updating related transaction (Target: Atomicity Gap)
11. **The ID Poison**: `create couriers/!@#$%^&* { name: 'Attack' }` (Target: Path ID Poisoning)
12. **The Query Scraping**: `list orders` without `where` clause targeting allowed access (Target: Secure List Queries)

## Test Runner Plan
I will implement `firestore.rules.test.ts` using the Firebase Rules Unit Testing library to verify these constraints.
