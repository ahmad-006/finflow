import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  assertCanManageWorkspace,
  assertCanManageBilling,
  assertCanMutateLedger,
  assertCanRead,
  canManageWorkspace,
  canManageBilling,
  canMutateLedger,
  canRead,
} from "@/modules/auth/rbac";
import {
  updateCompanySettingsAction,
  inviteMemberAction,
  revokeInvitationAction,
  getCompanyMembersAndInvites,
} from "@/modules/settings/actions";
import {
  createInvoiceAction,
  recordPaymentAction,
} from "@/modules/invoices/actions";
import {
  createExpenseAction,
  markExpensePaidAction,
} from "@/modules/expenses/actions";
import {
  registerUser,
  acceptInvitation,
  getInvitationByToken,
} from "@/modules/auth/service";
import type { SessionPayload } from "@/modules/auth/types";

describe("Role-Based Access Control (RBAC) & Team Invitation Suite", () => {
  const createdCompanyIds: string[] = [];
  let testCompanyId = "";
  let ownerUserId = "";
  let adminUserId = "";
  let memberUserId = "";
  let viewerUserId = "";
  let testClientId = "";

  const timestamp = Date.now() + 1200;

  function makeSession(role: string, userId: string, companyId = testCompanyId): SessionPayload {
    return {
      userId,
      companyId,
      email: `${role.toLowerCase()}-${timestamp}@rbac-verify.pk`,
      fullName: `${role} Test User`,
      role,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
  }

  beforeAll(async () => {
    // Warm up serverless Neon connection
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await db.$queryRaw`SELECT 1`;
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // 1. Create company workspace
    const company = await db.company.create({
      data: {
        name: `RBAC Suite Corp ${timestamp}`,
        baseCurrency: "PKR",
        liquidReserve: 250000,
        safetyBuffer: 50000,
      },
    });
    testCompanyId = company.id;
    createdCompanyIds.push(company.id);

    // 2. Create users across roles
    const owner = await db.user.create({
      data: {
        companyId: company.id,
        email: `owner-${timestamp}@rbac-verify.pk`,
        fullName: "Owner User",
        role: "OWNER",
        emailVerified: true,
      },
    });
    ownerUserId = owner.id;

    const admin = await db.user.create({
      data: {
        companyId: company.id,
        email: `admin-${timestamp}@rbac-verify.pk`,
        fullName: "Admin User",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    adminUserId = admin.id;

    const member = await db.user.create({
      data: {
        companyId: company.id,
        email: `member-${timestamp}@rbac-verify.pk`,
        fullName: "Member User",
        role: "MEMBER",
        emailVerified: true,
      },
    });
    memberUserId = member.id;

    const viewer = await db.user.create({
      data: {
        companyId: company.id,
        email: `viewer-${timestamp}@rbac-verify.pk`,
        fullName: "Viewer User",
        role: "VIEWER",
        emailVerified: true,
      },
    });
    viewerUserId = viewer.id;

    // 3. Create test client for invoices
    const client = await db.client.create({
      data: {
        companyId: company.id,
        clientName: `Test Client ${timestamp}`,
        email: `client-${timestamp}@example.pk`,
      },
    });
    testClientId = client.id;
  }, 40000);

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.invitation.deleteMany({ where: { companyId } });
        await db.invoiceItem.deleteMany({ where: { invoice: { companyId } } });
        await db.invoice.deleteMany({ where: { companyId } });
        await db.expense.deleteMany({ where: { companyId } });
        await db.client.deleteMany({ where: { companyId } });
        await db.auditLog.deleteMany({ where: { companyId } });
        await db.user.deleteMany({ where: { companyId } });
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // cleanup ignore
      }
    }
  }, 40000);

  // =========================================================================
  // 1. Core Permission Assertion Functions
  // =========================================================================
  describe("Core Permission Assertion Functions", () => {
    it("assertCanManageWorkspace allows only OWNER and rejects ADMIN, MEMBER, VIEWER", () => {
      expect(canManageWorkspace("OWNER")).toBe(true);
      expect(canManageWorkspace("ADMIN")).toBe(false);
      expect(canManageWorkspace("MEMBER")).toBe(false);
      expect(canManageWorkspace("VIEWER")).toBe(false);

      expect(() => assertCanManageWorkspace("OWNER")).not.toThrow();
      expect(() => assertCanManageWorkspace("ADMIN")).toThrow("Forbidden");
      expect(() => assertCanManageWorkspace("MEMBER")).toThrow("Forbidden");
      expect(() => assertCanManageWorkspace("VIEWER")).toThrow("Forbidden");
    });

    it("assertCanManageBilling allows OWNER and ADMIN and rejects MEMBER and VIEWER", () => {
      expect(canManageBilling("OWNER")).toBe(true);
      expect(canManageBilling("ADMIN")).toBe(true);
      expect(canManageBilling("MEMBER")).toBe(false);
      expect(canManageBilling("VIEWER")).toBe(false);

      expect(() => assertCanManageBilling("OWNER")).not.toThrow();
      expect(() => assertCanManageBilling("ADMIN")).not.toThrow();
      expect(() => assertCanManageBilling("MEMBER")).toThrow("Forbidden");
      expect(() => assertCanManageBilling("VIEWER")).toThrow("Forbidden");
    });

    it("assertCanMutateLedger allows OWNER, ADMIN, and MEMBER and rejects VIEWER", () => {
      expect(canMutateLedger("OWNER")).toBe(true);
      expect(canMutateLedger("ADMIN")).toBe(true);
      expect(canMutateLedger("MEMBER")).toBe(true);
      expect(canMutateLedger("VIEWER")).toBe(false);

      expect(() => assertCanMutateLedger("OWNER")).not.toThrow();
      expect(() => assertCanMutateLedger("ADMIN")).not.toThrow();
      expect(() => assertCanMutateLedger("MEMBER")).not.toThrow();
      expect(() => assertCanMutateLedger("VIEWER")).toThrow("Forbidden");
    });

    it("assertCanRead allows OWNER, ADMIN, MEMBER, and VIEWER and rejects unauthenticated/unknown", () => {
      expect(canRead("OWNER")).toBe(true);
      expect(canRead("ADMIN")).toBe(true);
      expect(canRead("MEMBER")).toBe(true);
      expect(canRead("VIEWER")).toBe(true);
      expect(canRead("UNKNOWN")).toBe(false);

      expect(() => assertCanRead("OWNER")).not.toThrow();
      expect(() => assertCanRead("ADMIN")).not.toThrow();
      expect(() => assertCanRead("MEMBER")).not.toThrow();
      expect(() => assertCanRead("VIEWER")).not.toThrow();
      expect(() => assertCanRead("UNKNOWN")).toThrow("Forbidden");
    });
  });

  // =========================================================================
  // 2. OWNER Permissions
  // =========================================================================
  describe("OWNER Role Permissions", () => {
    it("allows OWNER to update workspace settings and financial reserves", async () => {
      const ownerSession = makeSession("OWNER", ownerUserId);
      const res = await updateCompanySettingsAction(
        null,
        {
          name: `Updated Suite Corp ${timestamp}`,
          liquidReserve: "320000",
          safetyBuffer: "65000",
        },
        ownerSession
      );

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe(`Updated Suite Corp ${timestamp}`);
      expect(res.data?.liquidReserve).toBe(320000);
      expect(res.data?.safetyBuffer).toBe(65000);
    }, 35000);

    it("allows OWNER to invite new team members", async () => {
      const ownerSession = makeSession("OWNER", ownerUserId);
      const inviteEmail = `owner-invited-${timestamp}@verify.pk`;
      const res = await inviteMemberAction(
        null,
        { email: inviteEmail, role: "ADMIN" },
        ownerSession
      );

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe(inviteEmail);
      expect(res.data?.role).toBe("ADMIN");
      expect(res.data?.token).toBeString();

      // Verify in DB
      const dbInvite = await db.invitation.findUnique({ where: { token: res.data!.token } });
      expect(dbInvite).not.toBeNull();
      expect(dbInvite?.companyId).toBe(testCompanyId);
      expect(dbInvite?.invitedByUserId).toBe(ownerUserId);
    }, 35000);

    it("allows OWNER to mutate records: create invoices, expenses, and record payments", async () => {
      const ownerSession = makeSession("OWNER", ownerUserId);

      // 1. Create invoice
      const invoiceRes = await createInvoiceAction(
        {
          clientId: testClientId,
          currency: "PKR",
          issueDate: "2026-11-21",
          dueDate: "2026-11-30",
          items: [{ description: "Owner Strategic Advisory", quantity: 1, unitPrice: 75000 }],
        },
        ownerSession
      );
      expect(invoiceRes.success).toBe(true);
      expect(invoiceRes.data?.id).toBeString();

      // 2. Record payment on invoice
      const paymentRes = await recordPaymentAction(
        {
          invoiceId: invoiceRes.data!.id,
          paidAmount: 75000,
          paidAt: new Date(),
        },
        ownerSession
      );
      expect(paymentRes.success).toBe(true);

      // 3. Create expense
      const expenseRes = await createExpenseAction(
        {
          title: `Owner Workspace Facility ${timestamp}`,
          category: "OTHER",
          amount: 25000,
          dueDate: "2026-12-05",
          recurrence: "NONE",
        },
        undefined,
        ownerSession
      );
      expect(expenseRes.success).toBe(true);
      expect(expenseRes.data?.id).toBeString();

      // 4. Mark expense paid
      const expensePaidRes = await markExpensePaidAction(
        expenseRes.data!.id,
        undefined,
        ownerSession
      );
      expect(expensePaidRes.success).toBe(true);
      expect(expensePaidRes.data?.isPaid).toBe(true);
    }, 35000);
  });

  // =========================================================================
  // 3. ADMIN Permissions
  // =========================================================================
  describe("ADMIN Role Permissions", () => {
    it("rejects ADMIN when attempting to update workspace settings and reserves", async () => {
      const adminSession = makeSession("ADMIN", adminUserId);
      const res = await updateCompanySettingsAction(
        null,
        {
          name: "Admin Attempted Renaming",
          liquidReserve: "999999",
          safetyBuffer: "99999",
        },
        adminSession
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain("Forbidden");
    }, 35000);

    it("allows ADMIN to invite new members and manage invoices/payments", async () => {
      const adminSession = makeSession("ADMIN", adminUserId);

      // 1. Invite a member
      const inviteEmail = `admin-invited-${timestamp}@verify.pk`;
      const inviteRes = await inviteMemberAction(
        null,
        { email: inviteEmail, role: "MEMBER" },
        adminSession
      );
      expect(inviteRes.success).toBe(true);
      expect(inviteRes.data?.email).toBe(inviteEmail);
      expect(inviteRes.data?.role).toBe("MEMBER");

      // 2. Create an invoice
      const invoiceRes = await createInvoiceAction(
        {
          clientId: testClientId,
          currency: "PKR",
          issueDate: "2026-11-21",
          dueDate: "2026-12-10",
          items: [{ description: "Admin Operations Setup", quantity: 2, unitPrice: 20000 }],
        },
        adminSession
      );
      expect(invoiceRes.success).toBe(true);
      expect(invoiceRes.data?.id).toBeString();

      // 3. Record payment against invoice
      const paymentRes = await recordPaymentAction(
        {
          invoiceId: invoiceRes.data!.id,
          paidAmount: 40000,
          paidAt: new Date(),
        },
        adminSession
      );
      expect(paymentRes.success).toBe(true);

      // 4. Create and pay expense
      const expenseRes = await createExpenseAction(
        {
          title: `Admin Software Tool ${timestamp}`,
          category: "SOFTWARE",
          amount: 12000,
          dueDate: "2026-12-01",
          recurrence: "NONE",
        },
        undefined,
        adminSession
      );
      expect(expenseRes.success).toBe(true);

      const payRes = await markExpensePaidAction(expenseRes.data!.id, undefined, adminSession);
      expect(payRes.success).toBe(true);
    }, 35000);
  });

  // =========================================================================
  // 4. MEMBER Permissions
  // =========================================================================
  describe("MEMBER Role Permissions", () => {
    let memberCreatedInvoiceId = "";
    let memberCreatedExpenseId = "";

    it("allows MEMBER to create invoices and expenses", async () => {
      const memberSession = makeSession("MEMBER", memberUserId);

      // 1. Create invoice
      const invoiceRes = await createInvoiceAction(
        {
          clientId: testClientId,
          currency: "PKR",
          issueDate: "2026-11-21",
          dueDate: "2026-12-15",
          items: [{ description: "Engineering Implementation Sprint", quantity: 1, unitPrice: 60000 }],
        },
        memberSession
      );
      expect(invoiceRes.success).toBe(true);
      expect(invoiceRes.data?.id).toBeString();
      memberCreatedInvoiceId = invoiceRes.data!.id;

      // 2. Create expense
      const expenseRes = await createExpenseAction(
        {
          title: `Dev Cloud Compute ${timestamp}`,
          category: "SOFTWARE",
          amount: 8000,
          dueDate: "2026-12-05",
          recurrence: "NONE",
        },
        undefined,
        memberSession
      );
      expect(expenseRes.success).toBe(true);
      expect(expenseRes.data?.id).toBeString();
      memberCreatedExpenseId = expenseRes.data!.id;
    }, 35000);

    it("rejects MEMBER when attempting to mark payments or expenses as paid", async () => {
      const memberSession = makeSession("MEMBER", memberUserId);

      // Attempt recording invoice payment
      const paymentRes = await recordPaymentAction(
        {
          invoiceId: memberCreatedInvoiceId,
          paidAmount: 60000,
          paidAt: new Date(),
        },
        memberSession
      );
      expect(paymentRes.success).toBe(false);
      expect(paymentRes.error).toContain("Forbidden");

      // Attempt marking expense as paid
      const payExpenseRes = await markExpensePaidAction(
        memberCreatedExpenseId,
        undefined,
        memberSession
      );
      expect(payExpenseRes.success).toBe(false);
      expect(payExpenseRes.error).toContain("Forbidden");
    }, 35000);

    it("rejects MEMBER when attempting to manage team invitations or workspace settings", async () => {
      const memberSession = makeSession("MEMBER", memberUserId);

      // Attempt workspace update
      const updateRes = await updateCompanySettingsAction(
        null,
        { name: "Member Forbidden Update", liquidReserve: 100, safetyBuffer: 10 },
        memberSession
      );
      expect(updateRes.success).toBe(false);
      expect(updateRes.error).toContain("Forbidden");

      // Attempt invite member
      const inviteRes = await inviteMemberAction(
        null,
        { email: `member-illegal-${timestamp}@verify.pk`, role: "VIEWER" },
        memberSession
      );
      expect(inviteRes.success).toBe(false);
      expect(inviteRes.error).toContain("Forbidden");

      // Attempt revoke invitation
      const revokeRes = await revokeInvitationAction("some-id", undefined, memberSession);
      expect(revokeRes.success).toBe(false);
      expect(revokeRes.error).toContain("Forbidden");
    }, 35000);
  });

  // =========================================================================
  // 5. VIEWER Permissions
  // =========================================================================
  describe("VIEWER Role Permissions", () => {
    it("rejects VIEWER when attempting to create invoices, record payments, create expenses, or update settings", async () => {
      const viewerSession = makeSession("VIEWER", viewerUserId);

      // 1. Attempt invoice creation
      const invoiceRes = await createInvoiceAction(
        {
          clientId: testClientId,
          currency: "PKR",
          issueDate: "2026-11-21",
          dueDate: "2026-11-30",
          items: [{ description: "Viewer Attempt", quantity: 1, unitPrice: 1000 }],
        },
        viewerSession
      );
      expect(invoiceRes.success).toBe(false);
      expect(invoiceRes.error).toContain("Forbidden");

      // 2. Attempt payment recording
      const paymentRes = await recordPaymentAction(
        {
          invoiceId: "dummy-invoice-id",
          paidAmount: 500,
          paidAt: new Date(),
        },
        viewerSession
      );
      expect(paymentRes.success).toBe(false);
      expect(paymentRes.error).toContain("Forbidden");

      // 3. Attempt expense creation
      const expenseRes = await createExpenseAction(
        {
          title: "Viewer Forbidden Expense",
          category: "OTHER",
          amount: 5000,
          dueDate: "2026-12-01",
          recurrence: "NONE",
        },
        undefined,
        viewerSession
      );
      expect(expenseRes.success).toBe(false);
      expect(expenseRes.error).toContain("Forbidden");

      // 4. Attempt workspace settings update
      const settingsRes = await updateCompanySettingsAction(
        null,
        { name: "Viewer Name Change", liquidReserve: 500, safetyBuffer: 50 },
        viewerSession
      );
      expect(settingsRes.success).toBe(false);
      expect(settingsRes.error).toContain("Forbidden");

      // 5. Attempt team invitation
      const inviteRes = await inviteMemberAction(
        null,
        { email: `viewer-invite-${timestamp}@verify.pk`, role: "VIEWER" },
        viewerSession
      );
      expect(inviteRes.success).toBe(false);
      expect(inviteRes.error).toContain("Forbidden");
    }, 35000);

    it("allows VIEWER read-only access to company members and invitations", async () => {
      const viewerSession = makeSession("VIEWER", viewerUserId);
      const readRes = await getCompanyMembersAndInvites(testCompanyId, viewerSession);

      expect(readRes.success).toBe(true);
      expect(readRes.members.length).toBeGreaterThanOrEqual(4);
    }, 35000);
  });

  // =========================================================================
  // 6. Invitation Creation, Token Expiration, and Member Assignment
  // =========================================================================
  describe("Invitation Lifecycle and Tenancy Assignment", () => {
    let createdInviteId = "";
    let createdInviteToken = "";

    it("creates invitation with unique token, valid expiry, and assigned role", async () => {
      const ownerSession = makeSession("OWNER", ownerUserId);
      const inviteEmail = `lifecycle-invite-${timestamp}@verify.pk`;

      const res = await inviteMemberAction(
        null,
        { email: inviteEmail, role: "MEMBER" },
        ownerSession
      );

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe(inviteEmail);
      expect(res.data?.role).toBe("MEMBER");
      expect(res.data?.token).toBeString();

      createdInviteId = res.data!.id;
      createdInviteToken = res.data!.token;

      // Verify DB record
      const inviteRecord = await db.invitation.findUnique({
        where: { id: createdInviteId },
      });
      expect(inviteRecord).not.toBeNull();
      expect(inviteRecord?.companyId).toBe(testCompanyId);
      expect(inviteRecord?.role).toBe("MEMBER");
      expect(inviteRecord?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }, 35000);

    it("identifies expired tokens and rejects acceptance of expired invitations", async () => {
      const expiredToken = `token-expired-lifecycle-${timestamp}`;
      await db.invitation.create({
        data: {
          companyId: testCompanyId,
          email: `expired-member-${timestamp}@verify.pk`,
          role: "VIEWER",
          token: expiredToken,
          expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
          invitedByUserId: ownerUserId,
        },
      });

      const details = await getInvitationByToken(expiredToken);
      expect(details).not.toBeNull();
      expect(details?.isExpired).toBe(true);

      // Attempting to accept expired invitation must reject
      expect(acceptInvitation(expiredToken)).rejects.toThrow("expired");
    }, 35000);

    it("assigns newly registered user to existing companyId with assigned role upon accepting invitation", async () => {
      const inviteToken = `token-reg-flow-${timestamp}`;
      const inviteEmail = `newly-registered-${timestamp}@verify.pk`;

      await db.invitation.create({
        data: {
          companyId: testCompanyId,
          email: inviteEmail,
          role: "ADMIN",
          token: inviteToken,
          expiresAt: new Date(Date.now() + 86400000),
          invitedByUserId: ownerUserId,
        },
      });

      const registered = await registerUser({
        fullName: "Invited Admin User",
        email: inviteEmail,
        password: "ValidRegisterPassword2026!#",
        inviteToken,
      });

      expect(registered.user.companyId).toBe(testCompanyId);
      expect(registered.user.role).toBe("ADMIN");
      expect(registered.company.id).toBe(testCompanyId);

      // Invitation record should be consumed and deleted
      const consumedInvite = await db.invitation.findUnique({
        where: { token: inviteToken },
      });
      expect(consumedInvite).toBeNull();
    }, 35000);

    it("allows existing user from another company to join existing companyId with assigned role", async () => {
      // 1. Create a separate company and user
      const otherCompany = await db.company.create({
        data: {
          name: `Other Corp ${timestamp}`,
          baseCurrency: "PKR",
        },
      });
      createdCompanyIds.push(otherCompany.id);

      const existingUser = await db.user.create({
        data: {
          companyId: otherCompany.id,
          email: `existing-transferred-${timestamp}@verify.pk`,
          fullName: "Transferred User",
          role: "VIEWER",
          emailVerified: true,
        },
      });

      // 2. Issue invitation for existing user to join testCompanyId as MEMBER
      const inviteToken = `token-transfer-${timestamp}`;
      await db.invitation.create({
        data: {
          companyId: testCompanyId,
          email: existingUser.email,
          role: "MEMBER",
          token: inviteToken,
          expiresAt: new Date(Date.now() + 86400000),
          invitedByUserId: ownerUserId,
        },
      });

      // 3. Accept invitation
      const acceptResult = await acceptInvitation(inviteToken, existingUser.id);
      expect(acceptResult.user.companyId).toBe(testCompanyId);
      expect(acceptResult.user.role).toBe("MEMBER");

      // Verify in DB
      const updatedUser = await db.user.findUnique({ where: { id: existingUser.id } });
      expect(updatedUser?.companyId).toBe(testCompanyId);
      expect(updatedUser?.role).toBe("MEMBER");
    }, 35000);

    it("allows ADMIN or OWNER to revoke pending invitations", async () => {
      const adminSession = makeSession("ADMIN", adminUserId);
      const res = await revokeInvitationAction(createdInviteId, undefined, adminSession);

      expect(res.success).toBe(true);

      const dbInvite = await db.invitation.findUnique({ where: { id: createdInviteId } });
      expect(dbInvite).toBeNull();
    }, 35000);
  });
});
