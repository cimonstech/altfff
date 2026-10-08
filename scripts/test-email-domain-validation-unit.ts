import { verifyEmailDomainAcceptsMail } from "../src/lib/emailDomainValidation";
import { suggestCommonEmailDomain } from "../src/lib/emailTypoSuggestion";

async function main() {
  const fake = await verifyEmailDomainAcceptsMail("test@yshoo.vom", async () => {
    throw Object.assign(new Error("NXDOMAIN"), { code: "ENOTFOUND" });
  });
  if (!fake.ok) {
    console.log("fake-domain:pass");
  } else {
    console.error("fake-domain:fail", fake);
    process.exit(1);
  }

  const noMx = await verifyEmailDomainAcceptsMail("test@example.com", async () => []);
  if (!noMx.ok) {
    console.log("empty-mx:pass");
  } else {
    console.error("empty-mx:fail", noMx);
    process.exit(1);
  }

  const real = await verifyEmailDomainAcceptsMail("test@gmail.com", async () => [
    { exchange: "gmail-smtp-in.l.google.com", priority: 5 },
  ]);
  if (real.ok && !real.failOpen) {
    console.log("mx-found:pass");
  } else {
    console.error("mx-found:fail", real);
    process.exit(1);
  }

  const failOpen = await verifyEmailDomainAcceptsMail("test@yshoo.vom", async () => {
    throw Object.assign(new Error("SERVFAIL"), { code: "ESERVFAIL" });
  });
  if (failOpen.ok && failOpen.failOpen) {
    console.log("fail-open:pass");
  } else {
    console.error("fail-open:fail", failOpen);
    process.exit(1);
  }

  const timeout = await verifyEmailDomainAcceptsMail("test@gmail.com", async () =>
    new Promise(() => {
      /* never resolves — outer race timeout should fail open */
    }),
  );
  if (timeout.ok && timeout.failOpen) {
    console.log("timeout-fail-open:pass");
  } else {
    console.error("timeout-fail-open:fail", timeout);
    process.exit(1);
  }

  const typo = suggestCommonEmailDomain("user@yahol.com");
  if (typo === "user@yahoo.com") {
    console.log("typo:pass", typo);
  } else {
    console.error("typo:fail", typo);
    process.exit(1);
  }

  const exact = suggestCommonEmailDomain("user@gmail.com");
  if (exact === null) {
    console.log("typo-exact:pass");
  } else {
    console.error("typo-exact:fail", exact);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
