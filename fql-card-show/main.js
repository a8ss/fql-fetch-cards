$(function () {

  $('#startBtn').on('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    $('tbody').html('')
    fqlOrder({countPage: $('#countPage').val()})
  })

  $('#startFetchCard').on('click', sendSMS)
  
  let once = new ClipboardJS('.order-cards p');
  once.on('success', function (d) {
    layer.msg('复制成功', {time: 2000})
  })
  
  $('#copyAll').on('click',function () {
    let copy = new ClipboardJS('#copyAll', {
      text: function (trigger) {
        let t = '';
        $('.order-cards p[data-clipboard-text]').each(function (i, n) {
          t += $(n).attr('data-clipboard-text') + "\r\n";
        })
        layer.msg('复制成功', {time: 2000})
        return t;
      }
    });
  })
})

function fqlOrder (param) {
  let cfg = $.extend({
    countPage: 1,
  }, param)

  fetchList(cfg.countPage)

  function showList (list) {
    if (list.retcode !== 0) {
      alert('接口获取失败：' + list.retmsg)
      return
    }

    cfg.maxPage = list.max_page
    cfg.totalNum = list.total_num

    let tbody = $('table tbody')
    list.order_list.forEach((n, i) => {
      console.log(n, i)

      let row = $('<tr>\n' +
        '            <td class="order-date"></td>\n' +
        '            <td class="order-id"></td>\n' +
        '            <td class="order-price"></td>\n' +
        '            <td class="order-cards"></td>\n' +
        '        </tr>')

      row.find('.order-date').text(n.create_time)
      row.find('.order-id').text(n.order_id + '(' + n.order_state_desc + ')')
      row.find('.order-price').text(n.order_info[0].product_info + ' ' + n.total_amount)
      row.data('info', n)
      tbody.append(row)
    })
  }

  function fetchList (page) {
    axios.post('https://order.fenqile.com/order/query_order_list.json', 'state_filter=&page=' + page).then(res => {
      showList(res.data)
    })
  }
}

function sendSMS () {

  let orderId = getNextWaitFetchOrderId()
  if (orderId === null) {
    return
  }

  //https://trade.fenqile.com/order/query_send_sms.json
  //  {"retcode":0,"retmsg":"ok","need_send_sms_flag":1}
  axios.post('https://trade.fenqile.com/order/query_send_sms.json', 'send_type=8').then(res => {
    let msg = '验证码已发送，请输入验证码'
    if (res.data.retcode === 0) {
      inputSMSCode()
    } else {
      msg = '验证码发送失败，5秒后自动重试。请注意查收'
      setTimeout(sendSMS, 5000)
    }
    layer.msg(msg)
  })
}

function inputSMSCode (msg) {
  if (!msg) msg = ''
  layer.prompt({maxlength: 6, minlength: 6, title: '请输入短信验证码 ' + msg}, function (value, index, elem) {
    getCard(value)
    layer.close(index)
  })
}

var orderIndex = 0
var $orderTr = {}
var orderData = {}

function getNextWaitFetchOrderId () {
  $orderTr = $('tbody tr:eq(' + orderIndex + ')')
  if ($orderTr.length === 0) {
    layer.alert('没有订单啦')
    return null
  }
  orderData = $orderTr.data('info')
  if (orderData.finish_trade_flag === 1) {
    return orderData.order_id
  } else {
    ++orderIndex;
    return getNextWaitFetchOrderId()
  }
}

function getCard (smsCode) {
  /**
   * https://trade.fenqile.com/order/query_verify_fulu_and_coupon_sms.json
   *    post  sms_code=223124&send_type=8&order_id=O20180510048467102504
   * https://trade.fenqile.com/order/query_verify_fulu_and_coupon_sms.json
   *  post sms_code=586824&send_type=8&order_id=O20180510048467102504
   *  {"retcode":0,"retmsg":"ok","virtual_info":{"fulu_info":[{"card_number":{"title":"\u5361\u53f71","value":"0111001805070021022"},"passwd":{"title":"\u5361\u5bc61","value":"111048300424322617"}},{"card_number":{"title":"\u5361\u53f72","value":"0111001805070021023"},"passwd":{"title":"\u5361\u5bc62","value":"111048300433422717"}},{"card_number":{"title":"\u5361\u53f73","value":"0111001805070021024"},"passwd":{"title":"\u5361\u5bc63","value":"111048300644122613"}},{"card_number":{"title":"\u5361\u53f74","value":"0111001805070021025"},"passwd":{"title":"\u5361\u5bc64","value":"111048300855722812"}},{"card_number":{"title":"\u5361\u53f75","value":"0111001805070021026"},"passwd":{"title":"\u5361\u5bc65","value":"111048300864322717"}}],"coupon_info":[]}}
   */
  let postdata = 'sms_code=' + smsCode + '&send_type=8&order_id=' + orderData.order_id
  axios.post('https://trade.fenqile.com/order/query_verify_fulu_and_coupon_sms.json', postdata).then(res => {
    if (res.data.retcode === 0) {
      let td = $orderTr.find('td:last');
      let cards = res.data.virtual_info.fulu_info;
      console.log(cards);
      $.each(cards, function (i, n) {
        let p = $('<p>', {'data-clipboard-text': n.card_number.value + "\t" + n.passwd.value});
        let c = $('<span>', {class: 'card', text: n.card_number.value})
        let pwd = $('<span>', {class: 'pwd', text: n.passwd.value})
        p.append(c)
        p.append(pwd)
        td.append(p)
      })
      ++orderIndex
      layer.msg('获取卡密成功，30秒后自动获取下一笔订单卡密');
      setTimeout(sendSMS, 30000)
    } else {
      inputSMSCode('验证码错误')
    }
  })

}
