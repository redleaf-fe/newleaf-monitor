const dayjs = require('dayjs');
const os = require('os');

module.exports = (ctx, options) => {
  if (!options.key || typeof options.key !== 'string') {
    return;
  }

  setInterval(async () => {
    const date = dayjs().format('YYYY-MM-DD');
    const time = dayjs().format('HH:mm');
    const Key = `${options.key}_${date}`;

    const cpuInfo = os.cpus();
    const freemem = os.freemem();
    const totalmem = os.totalmem();

    if (await ctx.redis.existsAsync(Key)) {
      const dataStr = await ctx.redis.hgetAsync(Key, time);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        data.cpuInfo = cpuInfo;
        data.memInfo = { freemem, totalmem };
        await ctx.redis.hsetAsync(Key, time, JSON.stringify(data));
      } else {
        // 可能已经过了一分钟，导致time那个时间点的数据为空
        await ctx.redis.hsetAsync(
          Key,
          time,
          JSON.stringify({
            cpuInfo,
            memInfo: {
              freemem,
              totalmem,
            },
          })
        );
      }
    } else {
      await ctx.redis.hsetAsync(
        Key,
        time,
        JSON.stringify({
          cpuInfo,
          memInfo: {
            freemem,
            totalmem,
          },
        })
      );
      ctx.redis.expire(Key, 86400 * 3);
    }
  }, 60000);
};
