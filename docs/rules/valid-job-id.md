# valid-job-id

Disallow BullMQ custom job ids that contain `:` or are integers.

💼 `recommended` (error), `strict` (error) · 💡 has suggestions (`:` → `-`)

## Why

BullMQ uses `:` as its Redis key separator and reserves integer ids for auto-generated ones.
`queue.add()` throws `Custom Id cannot contain :` / `Custom Id cannot be integers`
([job ids](https://docs.bullmq.io/guide/jobs/job-ids)), often only on the rare code path that sets a custom id.

## What it reports

String, number and template literals passed as `jobId` in `queue.add(name, data, opts)` or in a
`{ opts: { jobId } }` object (`addBulk`, `FlowProducer`). Values that are not literals are not checked.

## Examples

❌ `queue.add('sync', data, { jobId: \`user:${id}\` })`·`{ jobId: '42' }`

✅ `queue.add('sync', data, { jobId: \`user-${id}\` })`·`{ jobId: 'order-42' }`
