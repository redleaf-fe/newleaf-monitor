const dayjs = require('dayjs');

// key，redis的key的前缀
// whitePathList，请求路径白名单，白名单不记录
module.exports = (options) => {
  if (!options.key || typeof options.key !== 'string') {
    return async (ctx, next) => {
      await next();
    };
  }

  return async (ctx, next) => {
    const whitePathList = ['/favicon.png'].concat(options.whitePathList);
    const whiteReqList = ['GET', 'POST', 'PUT', 'DELETE', 'UPDATE'];

    if (
      !whiteReqList.includes(ctx.method) ||
      whitePathList.includes(ctx.path)
    ) {
      await next();
      return;
    }

    const start = new Date().getTime();

    await next();

    const end = new Date().getTime();

    const date = dayjs().format('YYYY-MM-DD');
    const time = dayjs().format('HH:mm');
    const Key = `${options.key}_${date}`;

    /**
     * newleaf_monitor_20200815
     * {
     *  "15:00": "{ \"reqNum\":1,\"reqTime\":22 }"
     * }
     * 
     */
    if (await ctx.redis.existsAsync(Key)) {
      const dataStr = await ctx.redis.hgetAsync(Key, time);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        data.reqNum = +data.reqNum + 1;
        data.reqTime = +data.reqTime + end - start;
        await ctx.redis.hsetAsync(Key, time, JSON.stringify(data));
      } else {
        // 可能已经过了一分钟，导致time那个时间点的数据为空
        await ctx.redis.hsetAsync(
          Key,
          time,
          JSON.stringify({
            reqNum: 1,
            reqTime: end - start,
          })
        );
      }
    } else {
      await ctx.redis.hsetAsync(
        Key,
        time,
        JSON.stringify({
          reqNum: 1,
          reqTime: end - start,
        })
      );
      ctx.redis.expire(Key, 86400 * 3);
    }
  };
};
