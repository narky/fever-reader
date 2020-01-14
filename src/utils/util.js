export const stripHTMLTag = msg => {
  msg = msg.replace(/<\/?[^>]*>/g, '') // 去除HTML Tag
  msg = msg.replace(/[|]*\n/, '') // 去除行尾空格
  msg = msg.replace(/&npsp;/ig, '') // 去掉npsp
  msg = msg.replace(/&amp;/ig, '&')
  return msg
}
