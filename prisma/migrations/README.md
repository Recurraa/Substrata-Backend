# Migrations

Apply the checked-in initial migration (includes `ChainEvent` and webhook tables):

```bash
npx prisma migrate deploy
```

For local experimentation without migration history:

```bash
npx prisma db push
```

Generate a new migration after schema edits:

```bash
npx prisma migrate dev --name describe_your_change
```
