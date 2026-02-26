import fs from 'fs'

const commands = [
  // MUSIC CATEGORY
  {
    name: 'play',
    aliases: ['p'],
    desc: 'Yêu cầu bot tham gia kênh thoại của bạn và phát bài nhạc hoặc toàn bộ danh sách phát. Bạn có thể nhập tên bài hát để tìm kiếm hoặc dán trực tiếp đường dẫn từ các nền tảng âm nhạc khác nhau.',
    category: 'music',
    options: [
      {
        name: 'tên / đường dẫn tới bài hát',
        required: true,
        desc: 'Tên bài hát cần tìm hoặc đường dẫn nhạc hợp lệ.'
      }
    ],
    examples: [
      ['play', 'Nơi này có anh'],
      ['play', 'https://youtu.be/FN7ALfpGxiI']
    ]
  },
  {
    name: 'search',
    aliases: ['find'],
    desc: 'Tìm kiếm nâng cao cho phép bạn chọn bài hát từ một danh sách kết quả trực quan. Bạn có thể chỉ định tìm kiếm theo bài hát, album hoặc danh sách phát, và chọn kết quả ứng ý từ bảng tùy chọn. Hỗ trợ nhiều nguồn nhạc khác nhau.',
    category: 'music',
    options: [
      {
        name: 'album',
        required: false,
        aliases: ['alb', 'ab'],
        desc: 'Khoanh vùng tìm kiếm toàn bộ album.'
      },
      {
        name: 'playlist',
        required: false,
        aliases: ['pls', 'pll'],
        desc: 'Khoanh vùng tìm kiếm theo danh sách phát.'
      },
      {
        name: 'tên / đường dẫn tới bài hát',
        required: true,
        desc: 'Tên bài hát, album, danh sách phát bạn muốn tìm hoặc đường dẫn hợp lệ.'
      }
    ],
    examples: [
      ['search', 'Nơi này có anh'],
      ['search album', 'Nơi này có anh'],
      ['search playlist', 'Nơi này có anh']
    ]
  },
  {
    name: 'pause',
    aliases: ['ps'],
    desc: 'Tạm dừng bài hát đang phát. Bạn cần ở trong cùng kênh thoại với bot để sử dụng lệnh này.',
    category: 'music',
    options: [],
    examples: [['pause', '']]
  },
  {
    name: 'resume',
    aliases: ['rs', 'unpause', 'continue'],
    desc: 'Tiếp tục phát bài nhạc đang bị tạm dừng. Yêu cầu bạn phải ở cùng kênh thoại với bot.',
    category: 'music',
    options: [],
    examples: [['resume', '']]
  },
  {
    name: 'skipto',
    aliases: ['st', 'nextto', 'nt'],
    desc: 'Bỏ qua một loạt bài và nhảy thẳng đến một bài hát cụ thể trong hàng chờ.',
    category: 'music',
    options: [{ name: 'vị trí', required: true, desc: 'Số thứ tự của bài hát trong hàng chờ.' }],
    examples: [
      ['skipto', '5'],
      ['st', '3']
    ]
  },
  {
    name: 'skip',
    aliases: ['s', 'n', 'next'],
    desc: 'Bỏ qua bài hát hiện hành đang phát để chuyển sang phát liền bài tiếp theo trong danh sách chờ.',
    category: 'music',
    options: [],
    examples: [
      ['skip', ''],
      ['next', '']
    ]
  },
  {
    name: 'back',
    aliases: ['b', 'previous', 'prev'],
    desc: 'Quay lại và phát lại bài hát vừa được phát trước đó. Bài hát hiện tại sẽ được tạm cất lại vào đầu danh sách chờ để nghe tiếp sau khi phát xong thao tác này.',
    category: 'music',
    options: [],
    examples: [
      ['back', ''],
      ['prev', '']
    ]
  },
  {
    name: 'seek',
    aliases: ['fw', 'rw'],
    desc: 'Tua bài hát đang phát tới một thời điểm cụ thể. Không hỗ trợ tua đối với các luồng phát trực tiếp.',
    category: 'music',
    options: [{ name: 'thời gian', required: true, desc: 'Thời gian muốn tua đến.' }],
    examples: [
      ['seek', '1:30'],
      ['seek', '90']
    ]
  },
  {
    name: 'replay',
    aliases: ['restart', 'rp'],
    desc: 'Phát lại bài nhạc hiện tại từ đầu thời gian (0:00). Không áp dụng cho các chương trình phát trực tiếp.',
    category: 'music',
    options: [],
    examples: [
      ['replay', ''],
      ['rp', '']
    ]
  },
  {
    name: 'volume',
    aliases: ['vol', 'v'],
    desc: 'Điều chỉnh âm lượng to hoặc nhỏ của bot từ 0% đến 100%.',
    category: 'music',
    requiresOwner: true,
    options: [{ name: 'mức âm lượng', required: true, desc: 'Một số nguyên từ 0 đến 100.' }],
    examples: [
      ['volume', '50'],
      ['v', '100']
    ]
  },
  {
    name: 'filter',
    aliases: ['f', 'effects', 'fx'],
    desc: 'Áp dụng những hiệu ứng âm thanh thú vị cho bài nhạc. Nhập lệnh với tuỳ chọn báo xoá để khôi phục toàn bộ hiệu ứng trở về ban đầu.',
    category: 'music',
    options: [
      {
        name: 'tên hiệu ứng',
        required: true,
        desc: 'Các hiệu ứng hỗ trợ: nightcore, vaporwave, karaoke, 8d, tremolo, vibrato, lowpass, bassboost, clear, off.'
      }
    ],
    examples: [
      ['filter', 'nightcore'],
      ['filter', 'bassboost'],
      ['filter', 'clear']
    ]
  },
  {
    name: 'nowplaying',
    aliases: ['np', 'current'],
    desc: 'Hiển thị ngay lập tức thông tin chi tiết về bài hát đang được phát, bao gồm tên bài, tác giả, đường dẫn, thời lượng và ảnh bìa minh họa.',
    category: 'music',
    options: [],
    examples: [
      ['nowplaying', ''],
      ['np', '']
    ]
  },
  {
    name: 'status',
    aliases: ['state', 'info'],
    desc: 'Xem tình trạng hoạt động hiện tại của bot âm nhạc, bao gồm mức âm lượng, hiệu ứng nào đang sử dụng, có đang bật chế độ lặp hay tính năng tự động phát không.',
    category: 'music',
    options: [],
    examples: [
      ['status', ''],
      ['info', '']
    ]
  },
  {
    name: 'favorite',
    aliases: ['fav'],
    desc: 'Quản lý bài hát yêu thích của bạn. Thêm bài đang phát, xoá bài cũ, xem danh sách cá nhân và phát toàn bộ danh sách yêu thích dễ dàng trực tiếp.',
    category: 'music',
    options: [
      {
        name: 'add / remove / play / (hiển thị danh sách)',
        required: false,
        desc: 'Sử dụng `add` để lưu nhạc đang phát, `remove` kèm theo vị trí để xoá, hoặc để trống để hiển thị danh sách có sẵn để bạn tuỳ chọn.'
      }
    ],
    examples: [
      ['favorite add', ''],
      ['fav rm', '1-3'],
      ['fav play', ''],
      ['favorite', '']
    ]
  },

  // QUEUE CATEGORY
  {
    name: 'queue',
    aliases: ['q', 'list'],
    desc: 'Hiển thị các bài hát đang có trong hàng chờ của phòng. Bạn có thể dùng các nút điều hướng để xem các trang tiếp theo một cách dễ dàng.',
    category: 'queue',
    options: [
      { name: 'số trang', required: false, desc: 'Số trang bạn muốn xem (mặc định là trang 1).' }
    ],
    examples: [
      ['queue', ''],
      ['queue', '2']
    ]
  },
  {
    name: 'clear',
    aliases: ['c', 'cq', 'empty'],
    desc: 'Huỷ bỏ toàn bộ các bài hát đang có trong hàng chờ chung.',
    category: 'queue',
    requiresOwner: true,
    options: [],
    examples: [
      ['clear', ''],
      ['cq', '']
    ]
  },
  {
    name: 'loop',
    aliases: ['l', 'repeat'],
    desc: 'Thay đổi chế độ vòng lặp nhạc: lặp đi lặp lại 1 bài hiện hành, lặp đi lặp lại toàn bộ danh sách chờ, hoặc thiết lập tắt chế độ lặp.',
    category: 'queue',
    options: [
      {
        name: 'chế độ',
        required: false,
        desc: 'Tuỳ chọn chế độ lặp: `track` (1 bài), `queue` (toàn bộ) hoặc `off` (tắt). Nếu để trống, bot sẽ tự động chuyển đổi luân phiên giữa các chế độ.'
      }
    ],
    examples: [
      ['loop', ''],
      ['repeat', ''],
      ['loop', 'track']
    ]
  },
  {
    name: 'shuffle',
    aliases: ['sh', 'mix', 'random'],
    desc: 'Trộn nhạc hoàn toàn ngẫu nhiên để thay đổi trải nghiệm thứ tự phát của các bài hát trong hàng chờ hiện tại. Yêu cầu có ít nhất 2 bài hát bên trong.',
    category: 'queue',
    options: [],
    examples: [
      ['shuffle', ''],
      ['mix', '']
    ]
  },
  {
    name: 'move',
    aliases: ['m', 'mv'],
    desc: 'Di chuyển một bài hát nhất định từ vị trí này sang tận vị trí nọ trong hàng đợi một cách gọn gàng, giúp bạn ưu tiên nhạc theo ý thích.',
    category: 'queue',
    options: [
      {
        name: 'vị trí hiện tại',
        required: true,
        desc: 'Vị trí của bài hát đang nằm trong hàng chờ.'
      },
      {
        name: 'vị trí mới',
        required: false,
        desc: 'Vị trí bạn muốn chuyển đến (mặc định là lên đầu hàng chờ).'
      }
    ],
    examples: [
      ['move', '5'],
      ['move', '5 2']
    ]
  },
  {
    name: 'remove',
    aliases: ['rm', 'delete', 'del'],
    desc: 'Xoá tay một hoặc xoá hàng loạt nhiều bài hát khỏi hàng chờ. Bạn có thể tự do xoá các bài ở vị trí ngắt quãng hoặc xóa liên tiếp một khoảng bài hát.',
    category: 'queue',
    options: [
      {
        name: 'vị trí / khoảng',
        required: true,
        desc: 'Các vị trí của bài hát trong hàng chờ cần loại bỏ.'
      }
    ],
    examples: [
      ['remove', '1'],
      ['remove', '2 7 4'],
      ['remove', '2-7']
    ]
  },
  {
    name: 'insert',
    aliases: ['i', 'add', 'playnext', 'pn'],
    desc: 'Thêm nhanh một bài hát vào danh sách phát nhưng ở thẳng một thứ hạng cụ thể trong hàng chờ thay vì bị xếp nhét vào cuối cùng.',
    category: 'queue',
    options: [
      { name: 'vị trí', required: true, desc: 'Vị trí muốn chèn vào trong danh sách chờ.' },
      {
        name: 'tên / đường dẫn tới bài hát',
        required: true,
        desc: 'Tên bài hát hoặc đường dẫn âm nhạc.'
      }
    ],
    examples: [
      ['insert', '1 Nơi này có anh'],
      ['playnext', '2 https://youtu.be/FN7ALfpGxiI']
    ]
  },
  {
    name: 'autoplay',
    aliases: ['ap', 'endless'],
    desc: 'Bật hay tắt tính năng nhạc vô tận tự động. Khi nghe hết danh sách của người dùng, nếu bật tính năng này, bot sẽ tự động tìm kiếm các bài hát liên quan để phát tiếp.',
    category: 'queue',
    options: [],
    examples: [
      ['autoplay', ''],
      ['endless', '']
    ]
  },

  // INFO/GENERAL CATEGORY
  {
    name: 'join',
    aliases: ['j'],
    desc: 'Lệnh chủ động gọi bot tham gia vào kênh thoại hiện hành của bạn.',
    category: 'info',
    options: [],
    examples: [['join', '']]
  },
  {
    name: 'leave',
    aliases: ['lv', 'dc', 'disconnect', 'stop'],
    desc: 'Ngưng hoàn toàn việc cung cấp nhạc, xoá trắng mọi dữ liệu hiện thời và thoát phòng thoại.',
    category: 'info',
    requiresOwner: true,
    options: [],
    examples: [
      ['leave', ''],
      ['stop', '']
    ]
  },
  {
    name: 'claim',
    aliases: ['c'],
    desc: 'Tự động chiếm đoạt và lấy lại quyền điều khiển bot. Lệnh này hữu ích vô cùng nếu cựu chủ phòng đã rời máy mà bạn muốn tuỳ chỉnh nhạc nội bộ.',
    category: 'info',
    options: [],
    examples: [['claim', '']]
  },
  {
    name: 'help',
    aliases: ['h'],
    desc: 'Truy xuất thư viện đường dẫn đến trang web danh sách lệnh bot cực kỳ xinh đẹp này.',
    category: 'info',
    options: [],
    examples: [['help', '']]
  },
  {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    desc: 'Bảng vàng ghi danh các bài nhạc được nghe nhiều nhất của bạn, kỷ lục bài hát của cả máy chủ chung, hoặc vinh danh người dùng nghiện nghe nhạc nhất tại đây.',
    category: 'info',
    options: [],
    examples: [
      ['leaderboard', ''],
      ['top', '']
    ]
  },
  {
    name: 'notify',
    aliases: ['thongbao'],
    desc: 'Phát thanh một đoạn văn bản thông báo từ Ban Quản Trị đến tất cả các kênh người dùng đang nghe nhạc. Tính năng hạn chế chỉ khả dụng cho chủ sở hữu đích thực của máy chủ.',
    category: 'info',
    options: [
      {
        name: 'Mô tả thông báo',
        required: true,
        desc: 'Đoạn tin nhắn muốn gửi đi toàn bộ cụm máy chủ.'
      }
    ],
    examples: [['notify', 'Bot sẽ bảo trì trong 5 phút nữa, các bạn nhớ lưu nhạc lại nhé!']]
  }
]

let cardsHtml = ''

for (const cmd of commands) {
  const svgIcon =
    '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'

  const hasExpanded =
    cmd.examples || (cmd.options && cmd.options.length > 0) || cmd.aliases.length > 0

  let expandedHtml = ''
  if (hasExpanded) {
    let aliasesHtml = ''
    if (cmd.aliases && cmd.aliases.length > 0) {
      aliasesHtml =
        '<div class="divider"></div><h3 class="section-title">lệnh gõ tắt (aliases)</h3><div class="pill-group">'
      for (const alias of cmd.aliases) {
        aliasesHtml += '<span class="pill">' + alias + '</span>'
      }
      aliasesHtml += '</div>'
    }

    let optionsHtml = ''
    if (cmd.options && cmd.options.length > 0) {
      optionsHtml =
        '<div class="divider"></div><h3 class="section-title">tham số đầu vào</h3><div class="arg-list">'
      for (const opt of cmd.options) {
        const reqText = opt.required ? 'BẮT BUỘC' : 'TUỲ CHỌN'

        let argAliasesHtml = ''
        if (opt.aliases && opt.aliases.length > 0) {
          argAliasesHtml = `
                    <div class="pill-combo">
                        <div class="pill-left">gõ tắt</div>
                        <div class="pill-right">${opt.aliases.join(', ')}</div>
                    </div>
                `
        }

        let optDesc = opt.desc
          ? '<div class="arg-desc">' +
            opt.desc
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/`([^`]+)`/g, '<span class="highlight-text">$1</span>') +
            '</div>'
          : ''

        optionsHtml += `
                <div class="arg-item">
                    <div class="pill-group" style="margin-bottom: 6px;">
                        <div class="pill-combo">
                            <div class="pill-left">${opt.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                            <div class="pill-right">${reqText}</div>
                        </div>
                        ${argAliasesHtml}
                    </div>
                    ${optDesc}
                </div>
            `
      }
      optionsHtml += '</div>'
    }

    const hasOptions = cmd.options && cmd.options.length > 0

    let examplesHtml = ''
    if (cmd.examples && cmd.examples.length > 0 && hasOptions) {
      examplesHtml =
        '<div class="divider"></div><h3 class="section-title">ví dụ cách dùng</h3><div class="pill-group">'
      for (const ex of cmd.examples) {
        examplesHtml += '<div class="pill-combo"><div class="pill-left">' + ex[0] + '</div>'
        if (ex[1]) {
          examplesHtml +=
            '<div class="pill-right">' +
            ex[1].replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</div>'
        }
        examplesHtml += '</div>'
      }
      examplesHtml += '</div>'
    }

    expandedHtml =
      '<div class="expanded-content">' + optionsHtml + examplesHtml + aliasesHtml + '</div>'
  }

  const hasExpandedHtml =
    expandedHtml.includes('<div class="divider">') || expandedHtml.includes('class="pill-group"')

  const showMoreBtn = hasExpandedHtml
    ? '<button class="show-more" onclick="toggleExpand(this)">mở rộng chi tiết</button>'
    : ''

  const ownerBadge = cmd.requiresOwner ? '<span class="owner-badge">CHỦ XỊ</span>' : ''

  const finalCmdDesc = cmd.desc.replace(/`([^`]+)`/g, '<span class="highlight-text">$1</span>')

  cardsHtml += `
            <div class="command-card" data-category="${cmd.category}" data-name="${cmd.name}">
                <div class="command-header">
                    <h2 class="command-title">${cmd.name} ${svgIcon} ${ownerBadge}</h2>
                </div>
                <div class="command-desc">
                    ${finalCmdDesc}
                    ${showMoreBtn}
                </div>
                ${expandedHtml}
            </div>
  `
}

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commands | Music Bot</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        :root {
            --bg-color: #1a202c;
            --card-bg: #61292e;
            --pill-bg: #ffffff;
            --text-main: #ffffff;
            --text-pill: #a3353e;
            --search-bg: #a3353e;
            --divider: rgba(255, 255, 255, 0.1);
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg-color);
            background-image: radial-gradient(circle at 15% 50%, rgba(46,65,110,0.1), transparent 50%),
                              radial-gradient(circle at 85% 30%, rgba(46,65,110,0.1), transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            font-family: 'Montserrat', sans-serif;
            min-height: 100vh;
        }

        .container {
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            margin-bottom: 20px;
        }

        h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 800;
        }

        .search-bar {
            width: 100%;
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }

        .search-bar input, .search-bar select {
            padding: 14px 20px;
            border-radius: 6px;
            border: none;
            background-color: var(--search-bg);
            color: white;
            font-size: 16px;
            font-weight: 500;
            font-family: 'Montserrat', sans-serif;
            outline: none;
        }

        .search-bar input {
            flex-grow: 1;
        }

        .search-bar input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        .search-bar select {
            cursor: pointer;
            appearance: none;
            padding-right: 40px;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 15px top 50%;
            background-size: 12px auto;
        }

        .search-bar select option {
            background-color: var(--search-bg);
            color: white;
        }

        .command-card {
            background-color: var(--card-bg);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .command-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.25);
        }

        .command-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }

        .command-title {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
        }

        .command-title svg {
            width: 18px;
            height: 18px;
            fill: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            transition: fill 0.2s;
        }

        .command-title svg:hover {
            fill: #fff;
        }

        .owner-badge {
            font-size: 11px;
            background-color: #ffcc00; /* Yellow/Gold for distinction */
            color: #4a3b00;
            padding: 3px 6px;
            border-radius: 4px;
            font-weight: 800;
            margin-left: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: inline-flex;
            align-items: center;
        }

        .highlight-text {
            color: #ff6b6b;
            font-weight: 700;
        }

        .command-desc {
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 15px 0;
            display: flex;
            gap: 10px;
            color: #f1f1f1;
            flex-direction: column;
        }

        .show-more {
            background-color: rgba(255, 255, 255, 0.15);
            color: white;
            font-size: 12px;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            border: none;
            font-weight: 700;
            transition: background-color 0.2s;
            flex-shrink: 0;
            align-self: flex-start;
            text-transform: uppercase;
        }

        .show-more:hover {
            background-color: rgba(255, 255, 255, 0.25);
        }

        .divider {
            height: 1px;
            background-color: var(--divider);
            margin: 20px 0;
        }

        .section-title {
            font-size: 13px;
            font-weight: 800;
            margin: 0 0 12px 0;
            color: rgba(255,255,255,0.7);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Argument Styles */
        .arg-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .arg-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
            padding-bottom: 16px;
        }

        .arg-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .arg-desc {
            font-size: 14.5px;
            line-height: 1.6;
            color: #f1f1f1;
            padding-left: 2px;
        }

        .pill-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
        }

        .pill-group:last-child {
            margin-bottom: 0;
        }

        .pill {
            background-color: var(--pill-bg);
            color: var(--text-pill);
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .pill-combo {
            display: flex;
            background-color: var(--pill-bg);
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid var(--pill-bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .pill-combo .pill-left {
            background-color: var(--pill-bg);
            color: var(--text-pill);
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 800;
            border-right: 1px solid rgba(0,0,0,0.1);
        }

        .pill-combo .pill-right {
            background-color: #923a41;
            color: white;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 600;
            font-family: monospace;
        }

        .expanded-content {
            display: none;
        }

        .expanded-content.active {
            display: block;
            margin-top: 15px;
        }
    </style>
</head>
<body>

    <div class="container">
        <header>
            <h1>Danh sách lệnh</h1>
        </header>

        <div class="search-bar">
            <input type="text" id="searchInput" placeholder="Tìm kiếm lệnh...">
            <select id="categorySelect">
                <option value="all">Tất cả danh mục</option>
                <option value="music">Âm nhạc</option>
                <option value="queue">Hàng chờ</option>
                <option value="info">Khác</option>
            </select>
        </div>

        <div id="commands-list">
        ${cardsHtml}
        </div>
    </div>

    <script>
        function toggleExpand(button) {
            const content = button.parentElement.nextElementSibling;
            if (content && content.classList.contains('expanded-content')) {
                content.classList.toggle('active');
                button.innerText = content.classList.contains('active') ? 'THU GỌN CHI TIẾT' : 'MỞ RỘNG CHI TIẾT';
            }
        }

        const searchInput = document.getElementById('searchInput');
        const categorySelect = document.getElementById('categorySelect');
        const cards = document.querySelectorAll('.command-card');

        function filterCommands() {
            const query = searchInput.value.toLowerCase();
            const category = categorySelect.value;
            cards.forEach(card => {
                const name = card.getAttribute('data-name');
                const cat = card.getAttribute('data-category');
                const aliases = Array.from(card.querySelectorAll('.pill')).map(p => p.innerText.toLowerCase());
                
                const matchesQuery = name.includes(query) || aliases.some(a => a.includes(query));
                const matchesCat = category === 'all' || cat === category;

                if (matchesQuery && matchesCat) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        searchInput.addEventListener('input', filterCommands);
        categorySelect.addEventListener('change', filterCommands);
    </script>
</body>
</html>`

fs.writeFileSync('/home/yngpiu/Documents/music-bot/help.html', template)
console.log('Successfully generated help.html with beautiful structured arguments!')
