# valid-job-id

Disallow BullMQ custom job ids that contain `:` or are integers.

💼 `recommended` (error), `strict` (error) · 🔧 fixable with `--fix` (`:` → `-`) · 💡 has suggestions

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

## Fix

`--fix` replaces `:` with `-` in a literal or template `jobId`. BullMQ rejects such an id, so no job with the old id can exist
and the change cannot break deduplication of jobs already in Redis. Integer ids are reported without a fix, since the right prefix
is yours to pick.
