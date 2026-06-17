import { hashPassword } from "../src/lib/password";

// Produce an argon2id hash for manual operator provisioning.
//   pnpm hash-pw "<password>"
// Copy the printed hash into the User.passwordHash column in Neon.
async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: pnpm hash-pw "<password>"');
    process.exit(1);
  }
  console.log(await hashPassword(password));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
