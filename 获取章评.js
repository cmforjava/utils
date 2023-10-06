// ==UserScript==
// @name        获取章评
// @namespace   Violentmonkey Scripts
// @match       http://192.168.31.76:1122/vue/index.html
// @match       https://www.qidian.com/*
// @require     http://code.jquery.com/jquery-1.9.0.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @version     1.0
// @author      -
// @description 2023/10/5 08:18:55
// ==/UserScript==
(async () => {
  function get(url, headers, type, extra) {
    return new Promise((resolve, reject) => {
      let requestObj = GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers,
        responseType: type || 'json',
        onload: (res) => {
          if (res.status === 204) {
            requestObj.abort()
            resolve(res)
          }
          if (type === 'blob') {
            // res.status === 200 &&
            //   base.blobDownload(res.response, extra.filename)
            resolve(res)
          } else {
            resolve(res.response || res.responseText)
          }
        },
        onprogress: (res) => {
          if (extra && extra.filename && extra.index) {
            res.total > 0
              ? (progress[extra.index] = (
                (res.loaded * 100) /
                res.total
              ).toFixed(2))
              : (progress[extra.index] = 0.0)
          }
        },
        onloadstart() {
          extra &&
            extra.filename &&
            extra.index &&
            (request[extra.index] = requestObj)
        },
        onerror: (err) => {
          reject(err)
        },
      })
    })
  }
  let book = GM_getValue('book', {})
  if (location.host == 'www.qidian.com') {
    let _csrfToken = document.cookie.split(';').map(o => {
      let arr = o.split('=')
      return { key: arr[0].trim(), value: arr[1] }
    }).find(o => o.key == '_csrfToken').value
    book._csrfToken = _csrfToken
    GM_setValue('book', book)
  }
  let bookId, list, _csrfToken, bookn
  let segmentId = 1

  let oldright = $(`<div class="right"></div>`)[0]
  oldright.style =
    `position:fixed;z-index:999999999;width:450px;height:${window.innerHeight}px;top:0;left:0;overflow:auto`
  // document.body.append(oldright)
  let prelload = async (segmentId) => {
    if (!segmentId) {
      segmentId = -1
    }
    book = GM_getValue('book', {})
    list = book.list
    bookId = book.bookId
    let title = document.title.split(' ')[1]
    let reg = new RegExp(title)
    bookn = list.findIndex(o => o.cN.match(reg)) + 1
    let chapterId = list[bookn - 1].id
    let chapterReviews = await get(`https://www.qidian.com/ajax/chapterReview/reviewList?bookId=${book.bookId}&chapterId=${chapterId}&page=1&pageSize=20&segmentId=${segmentId}&type=2&_csrfToken=${book._csrfToken}`);
    console.log(chapterReviews)
    let contents = chapterReviews.data.list.map(o => o.content);
    return contents
  }
  let lload = async (contents) => {
    if (right.style.display == 'block') {
      right.style.display = 'none'
      return
    }
    let bookrevs = $(
      `<ul>${contents.map(o => `<li>${o}</li>`).join('')}</ul>`
    )[0]
    right.innerHTML = ''
    right.append(bookrevs)
    right.style.display = 'block'
  }
  let load = async () => {
    book = GM_getValue('book', {})
    list = book.list
    bookId = book.bookId
    let title = document.title.split(' ')[1]
    let reg = new RegExp(title)
    bookn = list.findIndex(o => o.cN.match(reg)) + 1

    let chapterId = list[bookn - 1].id
    let chapterReviews = await get(`https://www.qidian.com/ajax/chapterReview/reviewList?bookId=${book.bookId}&chapterId=${chapterId}&page=1&pageSize=20&segmentId=${segmentId}&type=2&_csrfToken=${book._csrfToken}`);
    let contents = chapterReviews.data.list.map(o => o.content);
    console.log(chapterReviews)
    let bookrevs = $(
      `<ul>${contents.map(o => `<li>${o}</li>`).join('')}</ul>`
    )[0]
    oldright.append(bookrevs)
    segmentId++
    if (contents.length > 1 && segmentId < 15) {
      load()
    }
  }
  let search = async (name) => {
    if (!name) {
      name = prompt('请输入书名')
    }
    book = GM_getValue('book', {})
    if (!book._csrfToken) {
      window.open('https://www.qidian.com/')
    }
    let web = await get(`https://www.qidian.com/so/${name}.html`)
    let aim = $(web).find(`a[title ^='${name}']`).toArray()[0]
    bookId = aim.href.match(/book\/(\d+)/)[1]
    book.name = aim.title
    book.bookId = bookId
    let chapters = await get(`https://www.qidian.com/ajax/book/category?bookId=${book.bookId}&_csrfToken=${book._csrfToken}`);
    list = chapters.data.vs.map(o => o.cs).flat()
    window.list = list
    book.list = list
    GM_setValue('book', book)
  }
  let button = $(`<button>章评</button>`)[0]
  button.onclick = load

  oldright.addEventListener('scroll', function (e) {
    // 当滚动事件被触发时执行以下代码
    if (oldright.scrollHeight -
      oldright.scrollTop ===
      oldright.clientHeight) {
      load()
    }
  });
  oldright.append(button)
  let right = $(`<div class="left"></div>`)[0]
  right.style =
    `position:fixed;z-index:999999999;width:${Math.min(window.innerWidth, 450)}px;height:${window.innerHeight}px;top:0;right:0;overflow:auto;pointer-events: none;background:rgb(237, 231, 218);display:none;`
  let lbutton = $(`<button>段评</button>`)[0]
  let preload = () => {
    $('.top-bar').next().children().toArray().map(async (o, i) => {
      let contents = await prelload(i)
      let paim = o?.children?.[0] || o
      paim.innerHTML += `<span style='display: inline-block;line-height:1em;
  background-color: grey;
  border-radius: 3px;
  padding: 1px 2px;
  color: white;
  clear: both;'>${contents.length}</span>`
      o.onclick = () => {
        lload(contents)
      }
    })
  }
  lbutton.onclick = preload
  document.body.append(right)
  // right.append(lbutton)
  setTimeout(() => {
    search(book.name)
    preload()
  }, 1000);
  document.onkeydown = async (e) => {
    if (e.key == 's') {
      search()
    }
    if (e.key == 'l') {
      load()
    }
  }
})()