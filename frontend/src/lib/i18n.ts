/**
 * GiuPay — i18n (Internationalization)
 * File từ điển trung tâm cho toàn bộ app.
 * Dùng cùng useTheme() hook đã có — t = translations[lang]
 *
 * Usage trong mỗi Page/Component:
 *   import { useTheme } from "@/lib/theme";
 *   const { t } = useTheme();
 *   <h1>{t.heroTitle}</h1>
 *
 * Thêm key mới: thêm vào CẢ HAI "vi" và "en" cùng lúc.
 */

export type Lang = "vi" | "en";

export const translations = {
  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED — NavBar, NavBarMinimal, buttons dùng khắp nơi
  // ─────────────────────────────────────────────────────────────────────────────
  vi: {
    // NavBar shared
    back:           "Quay lại",
    howItWorks:     "Cách hoạt động",
    exploreShops:   "Khám phá shop",
    openAShop:      "Mở shop",
    connectWallet:  "Kết nối ví",
    darkMode:       "Chế độ tối",
    lightMode:      "Chế độ sáng",
    language:       "Ngôn ngữ",
    profile:        "Hồ sơ",
    logout:         "Đăng xuất",

    // ── HomePage ──────────────────────────────────────────────────────────────
    heroEyebrow:    "Mạng Arc Testnet",
    heroTitle:      "Thanh toán onchain\ncho mọi cửa hàng",
    heroSub:        "Tạo đơn hàng, chia sẻ mã QR, nhận USDC tự động. Được bảo vệ bởi escrow thông minh trên Arc Network.",
    heroCTA:        "Khám phá shop",
    heroSecondaryCTA: "Mở shop của bạn",
    heroStatOrders:   "Đơn hàng",
    heroStatShops:    "Cửa hàng",
    heroStatEscrow:   "Được bảo vệ",

    // How it works
    howItWorksTitle:  "Hoạt động đơn giản",
    howItWorksSub:    "Ba bước từ tạo đơn đến nhận tiền.",
    step1Title:       "Tạo đơn & QR",
    step1Desc:        "Seller tạo đơn hàng trên GiuPay, hệ thống sinh mã QR thanh toán tức thì.",
    step2Title:       "Buyer thanh toán USDC",
    step2Desc:        "Buyer quét QR, chọn chain (Ethereum, Base, Polygon...) và thanh toán bằng USDC. Tiền vào escrow ngay.",
    step3Title:       "Tự động giải phóng",
    step3Desc:        "Sau 14 ngày không có tranh chấp, USDC tự động chuyển vào ví seller. SBT bảo hành được mint cho buyer.",

    // Shops section
    searchPlaceholder:  "Tìm cửa hàng...",
    allCategories:      "Tất cả",
    noShopsFound:       "Không tìm thấy shop nào",

    // Open shop CTA
    ctaEyebrow:     "Dành cho người bán",
    ctaTitle:       "Bắt đầu bán hàng onchain\ntrong 24 giờ",
    ctaSub:         "Đăng ký shop, xác minh danh tính, và được duyệt bởi đội ngũ GiuPay. Chỉ 0.1% mỗi giao dịch. Không có phí tháng.",
    ctaFeature1:    "Nhận USDC từ mọi EVM chain",
    ctaFeature2:    "Bảo vệ người mua 14 ngày qua escrow",
    ctaFeature3:    "SBT bảo hành được mint tự động",
    ctaFeature4:    "Được admin xác minh - tạo uy tín với buyer",
    ctaButton:      "Mở shop - Miễn phí",

    // Footer
    footerStatus:   "Arc Testnet đang hoạt động",

    // ── HomePage — Single CTA (bottom) ────────────────────────────────────────
    singleCtaEyebrow: "Bắt đầu ngay",
    singleCtaTitle:   "Sẵn sàng để bắt đầu?",
    singleCtaSub:     "Kết nối ví của bạn và chọn cách bạn muốn sử dụng GiuPay - mua hàng an toàn hoặc mở shop của riêng bạn.",
    singleCtaBtn:     "Kết nối ví để bắt đầu",
    singleCtaNote:    "Không thu phí · Không lưu khoá riêng tư",

    // ── SelectAccountPage ─────────────────────────────────────────────────────
    selectEyebrow:        "Bắt đầu",
    selectTitle:          "Bạn muốn dùng GiuPay như thế nào?",
    selectSub:            "Chọn loại tài khoản. Bạn có thể dùng cùng một địa chỉ ví cho cả tài khoản buyer và shop.",
    buyerTitle:           "Người mua",
    buyerSub:             "Duyệt các shop đã xác minh, thanh toán USDC từ bất kỳ chain nào và nhận SBT chứng minh mua hàng.",
    buyerFeature1:        "Thanh toán từ Ethereum, Base, Polygon, BNB Chain",
    buyerFeature2:        "Bảo vệ người mua 14 ngày qua escrow",
    buyerFeature3:        "SBT bảo hành được mint vào ví của bạn",
    buyerFeature4:        "Mở khiếu nại trong thời gian escrow",
    shopTitle:            "Cửa hàng",
    shopSub:              "Tạo đơn hàng, tạo mã QR, và nhận USDC tự động sau 14 ngày.",
    shopFeature1:         "Nhận USDC từ mọi chain được hỗ trợ",
    shopFeature2:         "Tự động giải phóng escrow - không cần rút tay",
    shopFeature3:         "Huy hiệu xác minh admin giúp tăng uy tín",
    shopFeature4:         "0.1% mỗi giao dịch, không có phí tháng",
    shopBadge:            "Cần xác minh",
    securityNote:         "GiuPay không bao giờ lưu hoặc yêu cầu khóa riêng tư hay cụm từ hạt giống của bạn. Ví của bạn ký giao dịch cục bộ - chúng tôi chỉ đọc địa chỉ công khai của bạn.",
    continueBtn:          "Tiếp tục",
    selectAccountType:    "Chọn loại tài khoản",
    browseShops:          "Duyệt shop",
    checkingShop:         "Đang kiểm tra...",
    walletConnected:      "Ví đã kết nối",
    redirecting:          "Đang chuyển hướng...",

    // ── PaymentPage ───────────────────────────────────────────────────────────
    payTitle:           "Thanh toán đơn hàng",
    chooseChain:        "Chọn chain thanh toán",
    chooseChainSub:     "Chọn chain bạn muốn dùng để gửi USDC.",
    continueToConnect:  "Tiếp tục",
    connectWalletStep:  "Kết nối ví",
    connectWalletSub:   "Kết nối ví để tiếp tục thanh toán.",
    payOnDapp:          "Trả trên dapp",
    payByQR:            "Quét QR để trả",
    connectToPayHint:   "Kết nối ví để thanh toán",
    approveUSDC:        "Cho phép USDC",
    approveSub:         "Cho phép hợp đồng sử dụng USDC của bạn.",
    approveBtn:         "Xác nhận & Tiếp tục",
    sendingUSDC:        "Đang gửi USDC...",
    walletPopupHint:    "Cần ký 2 lần trong ví (cho phép rồi gửi). Nếu ví không tự bật lên, bấm vào icon extension trên thanh trình duyệt để ký tiếp.",
    confirmingTx:       "Đang xác nhận giao dịch...",
    confirmingSafeToClose: "Bạn đã ký xong, có thể đóng trang này bất cứ lúc nào — hệ thống sẽ tự hoàn tất, kiểm tra lại đơn ở Hồ sơ cá nhân sau.",
    bridgingTitle:      "Đang bắc cầu USDC về Arc...",
    bridgingSafeToClose:"Thường mất khoảng 30 giây tới vài phút. Bạn có thể đóng trang này ngay bây giờ — hệ thống đã ghi nhận và sẽ tự động nộp tiền vào escrow khi bắc cầu xong, kiểm tra lại đơn ở Hồ sơ cá nhân sau.",
    paymentDone:        "Thanh toán thành công!",
    paymentDoneSub:     "Tiền đã vào escrow. Seller sẽ nhận sau 14 ngày nếu không có tranh chấp.",
    sbtMintedToastTitle:"SBT bằng chứng mua hàng đã được tạo",
    sbtMintedToastSub:  "Xem trong Hồ sơ của bạn",
    paymentError:       "Thanh toán thất bại",
    tryAgain:           "Thử lại",
    contractVerified:   "Contract đã xác minh",
    contractUnverified: "Contract chưa xác minh - không thanh toán",
    orderTotal:         "Tổng đơn hàng",
    platformFee:        "Phí nền tảng (0.1%)",
    shopReceives:       "Shop nhận được",
    via:                "qua Circle CCTP",
    payNow:             "Thanh toán ngay",
    qty:                "Số lượng",
    warrantyAndSBT:     "ngày bảo hành + SBT",
    sbtProof:           "SBT chứng minh mua hàng",

    // ── ReviewPage ────────────────────────────────────────────────────────────
    reviewTitle:          "Đánh giá sản phẩm",
    reviewSub:            "Chia sẻ trải nghiệm của bạn với cộng đồng.",
    ratingLabel:          "Đánh giá chung",
    commentLabel:         "Nhận xét bằng văn bản",
    commentHint:          "Tùy chọn",
    commentPlaceholder:   "Chia sẻ về chất lượng sản phẩm, đóng gói, thời gian giao hàng...",
    onchainWarning:       "Đánh giá của bạn sẽ được lưu vĩnh viễn trong hệ thống GiuPay. Không thể chỉnh sửa, xóa, hay khiếu nại sau khi gửi.",
    submitReview:         "Gửi đánh giá",
    selectStars:          "Chọn số sao để tiếp tục",
    confirmReviewTitle:   "Hành động này không thể hoàn tác",
    confirmReviewSub:     "Sau khi gửi, đánh giá của bạn sẽ được ghi lên blockchain và không thể thay đổi.",
    reviewPreview:        "Xem trước đánh giá",
    noComment:            "Không có nhận xét",
    confirmAndPost:       "Xác nhận & đăng",
    editReview:           "Sửa đánh giá",
    submittingReview:     "Đang ghi lên blockchain...",
    reviewDone:           "Đánh giá đã được đăng!",
    reviewDoneSub:        "Cảm ơn bạn đã chia sẻ trải nghiệm. Đánh giá của bạn giúp cộng đồng GiuPay tin tưởng hơn.",
    ineligibleTitle:      "Không thể đánh giá",
    ineligibleSub:        "Đơn hàng này chưa hoàn thành, đã có đánh giá, hoặc bạn không phải người mua của đơn này.",
    backToHome:           "Về trang chủ",

    // ── RegisterShopPage ──────────────────────────────────────────────────────
    registerTitle:    "Đăng ký cửa hàng",
    registerSub:      "Điền thông tin để mở shop trên GiuPay.",
    step1:            "Thông tin",
    step2:            "Tài liệu",
    step3:            "Hoàn tất",
    submitShop:       "Nộp đơn đăng ký",
    submitting:       "Đang nộp...",
    next:             "Tiếp theo",
    prev:             "Quay lại",

    // ── DashboardPage ─────────────────────────────────────────────────────────
    dashboardTitle:   "Bảng điều khiển",
    totalRevenue:     "Doanh thu",
    ordersThisMonth:  "Đơn tháng này",
    avgRating:        "Đánh giá TB",
    escrowPending:    "Đang escrow",
    allOrders:        "Tất cả đơn",
    shopPage:         "Trang shop",
    noOrders:         "Chưa có đơn hàng nào",
    filterAll:        "Tất cả",
    filterPending:    "Chờ TT",
    filterEscrow:     "Escrow",
    filterDone:       "Hoàn thành",
    escrowRelease:    "Giải phóng sau",
    days:             "ngày",

    // ── PendingPage ───────────────────────────────────────────────────────────
    pendingTitle:   "Đang chờ duyệt",
    pendingDesc:    "Shop của bạn đang được đội ngũ GiuPay xét duyệt. Thường mất 1–2 ngày làm việc.",
    pendingShop:    "Tên shop",
    pendingDate:    "Ngày đăng ký",
    goHome:         "Về trang chủ",

    // ── ProfilePage ───────────────────────────────────────────────────────────
    profileTitle:   "Hồ sơ của tôi",
    myOrders:       "Đơn hàng",
    mySBT:          "SBT của tôi",
    totalSpent:     "Đã chi",
    completed:      "Hoàn thành",
    inEscrow:       "Đang escrow",
    sbtCount:       "SBT",
    noOrdersYet:    "Bạn chưa có đơn hàng nào. Hãy khám phá các shop trên GiuPay!",
    noSBTYet:       "Bạn chưa có SBT nào.",
    sbtExplain:     "SBT (Soulbound Token) được mint tự động sau khi đơn hàng hoàn thành. Đây là bằng chứng mua hàng vĩnh viễn trên blockchain, không thể chuyển nhượng.",
    exploreShopsBtn:"Khám phá Shop",
    checkingWallet: "Đang kiểm tra kết nối ví...",

    // ── DocsPage ──────────────────────────────────────────────────────────────
    docsNavTitle:     "Tài liệu",
    docsTitle:        "GiuPay hoạt động như thế nào",
    docsSubtitle:     "Tổng quan cách thanh toán, bảo vệ escrow, bảo hành và tranh chấp hoạt động trên GiuPay.",

    docsOverviewTitle:"Tổng quan",
    docsOverviewBody: "GiuPay là nền tảng thanh toán escrow phi tập trung trên Arc Testnet. Bất kỳ shop nào cũng có thể bán hàng và nhận thanh toán bằng USDC, trong khi buyer được bảo vệ nhờ escrow thông minh: tiền không chuyển thẳng cho shop mà tạm giữ trong smart contract 14 ngày - đủ thời gian để phát hiện vấn đề và mở tranh chấp nếu cần.",

    docsBuyerTitle:   "Dành cho người mua",
    docsBuyer1Title:  "Kết nối ví & khám phá",
    docsBuyer1Desc:   "Kết nối ví (không cần tài khoản/mật khẩu), duyệt danh sách shop và sản phẩm, xem đánh giá từ người mua trước.",
    docsBuyer2Title:  "Thanh toán",
    docsBuyer2Desc:   "Trả trực tiếp bằng USDC trên Arc, hoặc bắc cầu USDC từ Ethereum, Base, Arbitrum, OP Sepolia qua Circle CCTP - tiền tự động đổ về đúng đơn trên Arc.",
    docsBuyer3Title:  "Tiền vào escrow",
    docsBuyer3Desc:   "Tiền không về tay shop ngay mà được giữ trong smart contract 14 ngày. Đây là thời gian buyer kiểm tra hàng và phản hồi nếu có vấn đề.",
    docsBuyer4Title:  "Nhận SBT bảo hành",
    docsBuyer4Desc:   "Ngay khi thanh toán vào escrow, 1 NFT bảo hành (không chuyển nhượng được) tự động xuất hiện trong hồ sơ - vừa là bằng chứng mua hàng, vừa theo dõi thời hạn bảo hành.",
    docsBuyer5Title:  "Đánh giá & mở tranh chấp nếu cần",
    docsBuyer5Desc:   "Sau khi nhận hàng, buyer có thể để lại đánh giá. Nếu hàng có vấn đề, buyer mở tranh chấp bất kỳ lúc nào trong 14 ngày escrow.",

    docsSellerTitle:  "Dành cho người bán",
    docsSeller1Title: "Đăng ký shop",
    docsSeller1Desc:  "Điền thông tin shop (tên, mô tả, danh mục, chính sách đổi trả) và tải lên giấy tờ xác minh.",
    docsSeller2Title: "Chờ duyệt",
    docsSeller2Desc:  "Đội ngũ GiuPay xác minh danh tính (thường trong 24 giờ), sau đó shop được xác nhận luôn trên blockchain - đây là điều kiện để buyer trả tiền được.",
    docsSeller3Title: "Đăng sản phẩm",
    docsSeller3Desc:  "Thêm sản phẩm với giá, ảnh và số ngày bảo hành. Buyer mua được ngay không cần thao tác gì thêm từ shop.",
    docsSeller4Title: "Giao hàng",
    docsSeller4Desc:  "Cập nhật trạng thái giao hàng cho buyer theo dõi. Nếu buyer mở tranh chấp, shop có thể tự nguyện hoàn tiền hoặc chờ admin xử lý.",
    docsSeller5Title: "Nhận tiền tự động",
    docsSeller5Desc:  "Nếu không có tranh chấp, tiền tự động chuyển vào ví shop sau 14 ngày - không cần thao tác gì thêm.",

    docsEscrowTitle:  "Vì sao cần escrow",
    docsEscrowBody:   "Escrow giữ tiền buyer trong smart contract thay vì chuyển thẳng cho shop, ngăn tình trạng nhận tiền xong không giao hàng. Sau 14 ngày không có tranh chấp, hợp đồng tự động giải phóng tiền cho shop - không cần admin can thiệp. GiuPay thu phí 0.1% mỗi giao dịch, không có phí ẩn nào khác.",

    docsWarrantyTitle:"SBT - bằng chứng mua hàng & bảo hành",
    docsWarrantyBody: "Ngay khi đơn vào escrow, 1 NFT soulbound (không thể chuyển nhượng hay bán lại) được tự động mint cho ví buyer - không cần buyer ký thêm giao dịch nào. NFT này lưu tên sản phẩm, shop, số tiền, ngày mua và ngày hết hạn bảo hành ngay trên blockchain, xem được công khai trên block explorer. Nếu sản phẩm không có bảo hành, NFT tồn tại vĩnh viễn như bằng chứng mua hàng; nếu có bảo hành, NFT tự động bị thu hồi (burn) khi hết hạn.",

    docsDisputeTitle: "Giải quyết tranh chấp",
    docsDisputeBody:  "Trong 14 ngày tiền còn ở escrow, buyer có thể mở tranh chấp nếu hàng lỗi, sai mô tả hoặc không nhận được hàng. Shop có thể chủ động hoàn tiền để giải quyết nhanh. Nếu 2 bên không thống nhất được, đội ngũ GiuPay xem xét bằng chứng từ cả 2 phía và đưa ra quyết định cuối cùng - hoàn tiền cho buyer hoặc giải ngân cho shop. Mọi quyết định đều được ghi nhận trên blockchain.",

    docsReviewChatTitle:"Đánh giá & nhắn tin",
    docsReviewChatBody:"Sau khi đơn hoàn tất, buyer để lại đánh giá (số sao + nhận xét) hiển thị công khai trên trang shop, giúp buyer sau tham khảo. Buyer và shop cũng có thể nhắn tin trực tiếp trong app để hỏi đáp về đơn hàng.",

    // Mục lục (sidebar)
    docsTocOverview:  "Tổng quan",
    docsTocBuyers:    "Người mua",
    docsTocSellers:   "Người bán",
    docsTocEscrow:    "Vì sao cần escrow",
    docsTocWarranty:  "SBT bảo hành",
    docsTocDispute:   "Tranh chấp",
    docsTocReviews:   "Đánh giá & nhắn tin",
    docsTocTech:      "Công nghệ sử dụng",
    docsTocContracts: "Contract đã deploy",
    docsTocFaq:       "Câu hỏi thường gặp",

    // Công nghệ sử dụng
    docsTechTitle:        "Công nghệ sử dụng",
    docsTechFrontendLabel:"Frontend",
    docsTechBackendLabel: "Backend",
    docsTechContractsLabel:"Hợp đồng thông minh",
    docsTechStorageLabel: "Lưu trữ",
    docsTechPaymentsLabel:"Thanh toán",

    // Contract đã deploy
    docsContractsTitle:  "Contract đã deploy (Arc Testnet)",
    docsContractsBody:   "Cả 3 contract đều đã verify, xem source code công khai trên Arc Explorer.",
    docsContractsViewOn: "Xem trên Arc Explorer",

    // FAQ
    docsFaqTitle:     "Câu hỏi thường gặp",
    docsFaq1Q:        "Đây là tiền thật hay chỉ là mô phỏng?",
    docsFaq1A:        "GiuPay chạy trên Arc Testnet với USDC testnet, không phải tiền thật, nhưng mọi giao dịch đều là giao dịch on-chain thật 100%, không có phần nào giả lập.",
    docsFaq2Q:        "GiuPay thu phí bao nhiêu?",
    docsFaq2A:        "0.1% mỗi giao dịch, không có phí tháng hay phí ẩn nào khác.",
    docsFaq3Q:        "Nếu buyer và shop không tự thoả thuận được khi tranh chấp thì sao?",
    docsFaq3A:        "Đội ngũ GiuPay xem xét bằng chứng từ cả 2 phía và đưa ra quyết định cuối cùng ngay trên blockchain - hoàn tiền cho buyer hoặc giải ngân cho shop.",
    docsFaq4Q:        "GiuPay đã lên mainnet chưa?",
    docsFaq4A:        "Chưa. GiuPay hiện đang chạy trên Arc Testnet và tiếp tục được phát triển.",
    docsFaq5Q:        "SBT bảo hành có bị mất khi hết hạn không?",
    docsFaq5A:        "Nếu sản phẩm có thời hạn bảo hành, SBT tự động bị thu hồi khi hết hạn. Nếu sản phẩm không có bảo hành, SBT tồn tại vĩnh viễn làm bằng chứng mua hàng.",
    docsFaq6Q:        "Tôi có thể trả tiền từ chain nào khác Arc không?",
    docsFaq6A:        "Có. Ngoài trả trực tiếp bằng USDC trên Arc, bạn có thể bắc cầu USDC từ Ethereum, Base, Arbitrum hoặc OP Sepolia qua Circle CCTP.",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ENGLISH
  // ─────────────────────────────────────────────────────────────────────────────
  en: {
    // NavBar shared
    back:           "Back",
    howItWorks:     "How it works",
    exploreShops:   "Explore shops",
    openAShop:      "Open a shop",
    connectWallet:  "Connect wallet",
    darkMode:       "Dark mode",
    lightMode:      "Light mode",
    language:       "Language",
    profile:        "Profile",
    logout:         "Log out",

    // ── HomePage ──────────────────────────────────────────────────────────────
    heroEyebrow:    "Arc Testnet",
    heroTitle:      "Onchain payments\nfor every shop",
    heroSub:        "Create orders, share QR codes, and receive USDC automatically. Secured by smart escrow on Arc Network.",
    heroCTA:        "Explore shops",
    heroSecondaryCTA: "Open your shop",
    heroStatOrders:   "Orders",
    heroStatShops:    "Shops",
    heroStatEscrow:   "Protected",

    // How it works
    howItWorksTitle:  "Simple by design",
    howItWorksSub:    "Three steps from order creation to payout.",
    step1Title:       "Create order & QR",
    step1Desc:        "Seller creates an order on GiuPay, the system instantly generates a payment QR code.",
    step2Title:       "Buyer pays with USDC",
    step2Desc:        "Buyer scans the QR, selects a chain (Ethereum, Base, Polygon...) and pays with USDC. Funds go to escrow immediately.",
    step3Title:       "Auto release",
    step3Desc:        "After 14 days with no dispute, USDC is automatically sent to the seller's wallet. A warranty SBT is minted for the buyer.",

    // Shops section
    searchPlaceholder:  "Search shops...",
    allCategories:      "All",
    noShopsFound:       "No shops found",

    // Open shop CTA
    ctaEyebrow:     "For Sellers",
    ctaTitle:       "Start selling onchain\nin under 24 hours",
    ctaSub:         "Register your shop, submit your ID, and get verified by our team. Only 0.1% per transaction. No monthly fee.",
    ctaFeature1:    "Accept USDC from any EVM chain",
    ctaFeature2:    "14-day escrow buyer protection",
    ctaFeature3:    "SBT warranty proof minted automatically",
    ctaFeature4:    "Admin verified - builds buyer trust",
    ctaButton:      "Open Your Shop - Free",

    // Footer
    footerStatus:   "Arc Testnet online",

    // ── HomePage — Single CTA (bottom) ────────────────────────────────────────
    singleCtaEyebrow: "Get started",
    singleCtaTitle:   "Ready to get started?",
    singleCtaSub:     "Connect your wallet and choose how you'd like to use GiuPay - shop safely or open your own store.",
    singleCtaBtn:     "Connect Wallet to Get Started",
    singleCtaNote:    "No fees to join · We never store your private key",

    // ── SelectAccountPage ─────────────────────────────────────────────────────
    selectEyebrow:        "Get started",
    selectTitle:          "How will you use GiuPay?",
    selectSub:            "Choose your account type. You can connect the same wallet address to both a buyer and a shop account.",
    buyerTitle:           "Buyer",
    buyerSub:             "Browse verified shops, pay with USDC from any chain, and get SBT proof of purchase.",
    buyerFeature1:        "Pay from Ethereum, Base, Polygon, BNB Chain",
    buyerFeature2:        "14-day escrow buyer protection",
    buyerFeature3:        "Warranty SBT minted to your wallet",
    buyerFeature4:        "Open disputes within the escrow window",
    shopTitle:            "Shop",
    shopSub:              "Create orders, generate QR codes, and receive USDC automatically after 14 days.",
    shopFeature1:         "Accept USDC from any supported chain",
    shopFeature2:         "Auto escrow release - no manual withdrawal",
    shopFeature3:         "Admin-verified badge builds buyer trust",
    shopFeature4:         "0.1% per transaction, no monthly fee",
    shopBadge:            "Requires verification",
    securityNote:         "GiuPay never stores or requests your private key or seed phrase. Your wallet signs transactions locally - we only read your public address.",
    continueBtn:          "Continue",
    selectAccountType:    "Select account type",
    browseShops:          "Browse shops",
    checkingShop:         "Checking...",
    walletConnected:      "Wallet connected",
    redirecting:          "Redirecting...",


    // ── PaymentPage ───────────────────────────────────────────────────────────
    payTitle:           "Order payment",
    chooseChain:        "Choose payment chain",
    chooseChainSub:     "Select the chain you want to use to send USDC.",
    continueToConnect:  "Continue",
    connectWalletStep:  "Connect wallet",
    connectWalletSub:   "Connect your wallet to proceed with payment.",
    payOnDapp:          "Pay on dapp",
    payByQR:            "Pay by scanning QR",
    connectToPayHint:   "Connect wallet to pay",
    approveUSDC:        "Approve USDC",
    approveSub:         "Allow the contract to use your USDC.",
    approveBtn:         "Approve & Continue",
    sendingUSDC:        "Sending USDC...",
    walletPopupHint:    "You'll need to sign twice in your wallet (approve, then send). If the wallet popup doesn't appear on its own, click the extension icon in your browser toolbar to continue.",
    confirmingTx:       "Confirming transaction...",
    confirmingSafeToClose: "You've signed already — feel free to close this page any time. We'll finish automatically; check the order again later in your Profile.",
    bridgingTitle:      "Bridging USDC to Arc...",
    bridgingSafeToClose:"This usually takes about 30 seconds to a few minutes. You can close this page now — we've recorded it and will deposit the funds into escrow automatically once bridging completes. Check the order again later in your Profile.",
    paymentDone:        "Payment successful!",
    paymentDoneSub:     "Funds are in escrow. Seller receives payment after 14 days if no dispute is raised.",
    sbtMintedToastTitle:"Your purchase proof SBT has been minted",
    sbtMintedToastSub:  "View it in your Profile",
    paymentError:       "Payment failed",
    tryAgain:           "Try again",
    contractVerified:   "Contract verified",
    contractUnverified: "Contract not verified - do not pay",
    orderTotal:         "Order total",
    platformFee:        "Platform fee (0.1%)",
    shopReceives:       "Shop receives",
    via:                "via Circle CCTP",
    payNow:             "Pay now",
    qty:                "Qty",
    warrantyAndSBT:     "day warranty + SBT",
    sbtProof:           "SBT proof of purchase",

    // ── ReviewPage ────────────────────────────────────────────────────────────
    reviewTitle:          "Review product",
    reviewSub:            "Share your experience with the community.",
    ratingLabel:          "Overall rating",
    commentLabel:         "Written review",
    commentHint:          "Optional",
    commentPlaceholder:   "Share about product quality, packaging, delivery time, or anything that impressed or surprised you.",
    onchainWarning:       "Your review will be stored permanently in GiuPay's system. It cannot be edited, deleted, or disputed after submission.",
    submitReview:         "Submit review",
    selectStars:          "Select a star rating to continue",
    confirmReviewTitle:   "This action cannot be undone",
    confirmReviewSub:     "Once submitted, your review will be written to the blockchain and cannot be changed.",
    reviewPreview:        "Review preview",
    noComment:            "No comment",
    confirmAndPost:       "Confirm & post",
    editReview:           "Edit review",
    submittingReview:     "Writing to blockchain...",
    reviewDone:           "Review posted!",
    reviewDoneSub:        "Thank you for sharing your experience. Your review helps the GiuPay community trust each other.",
    ineligibleTitle:      "Cannot review",
    ineligibleSub:        "This order is not completed, already has a review, or you are not the buyer of this order.",
    backToHome:           "Back to home",

    // ── RegisterShopPage ──────────────────────────────────────────────────────
    registerTitle:    "Register your shop",
    registerSub:      "Fill in the information to open your shop on GiuPay.",
    step1:            "Info",
    step2:            "Documents",
    step3:            "Done",
    submitShop:       "Submit application",
    submitting:       "Submitting...",
    next:             "Next",
    prev:             "Back",

    // ── DashboardPage ─────────────────────────────────────────────────────────
    dashboardTitle:   "Dashboard",
    totalRevenue:     "Revenue",
    ordersThisMonth:  "Orders this month",
    avgRating:        "Avg. rating",
    escrowPending:    "In escrow",
    allOrders:        "All orders",
    shopPage:         "Shop page",
    noOrders:         "No orders yet",
    filterAll:        "All",
    filterPending:    "Pending",
    filterEscrow:     "Escrow",
    filterDone:       "Completed",
    escrowRelease:    "Releases in",
    days:             "days",

    // ── PendingPage ───────────────────────────────────────────────────────────
    pendingTitle:   "Pending approval",
    pendingDesc:    "Your shop is being reviewed by the GiuPay team. This usually takes 1–2 business days.",
    pendingShop:    "Shop name",
    pendingDate:    "Registered on",
    goHome:         "Go to home",

    // ── ProfilePage ───────────────────────────────────────────────────────────
    profileTitle:   "My profile",
    myOrders:       "Orders",
    mySBT:          "My SBTs",
    totalSpent:     "Total spent",
    completed:      "Completed",
    inEscrow:       "In escrow",
    sbtCount:       "SBTs",
    noOrdersYet:    "You have no orders yet. Explore shops on GiuPay!",
    noSBTYet:       "You have no SBTs yet.",
    sbtExplain:     "SBTs (Soulbound Tokens) are minted automatically when an order is completed. They are permanent proof of purchase on the blockchain and cannot be transferred.",
    exploreShopsBtn:"Explore Shops",
    checkingWallet: "Checking wallet connection...",

    // ── DocsPage ──────────────────────────────────────────────────────────────
    docsNavTitle:     "Docs",
    docsTitle:        "How GiuPay works",
    docsSubtitle:     "An overview of payments, escrow protection, warranty, and dispute resolution on GiuPay.",

    docsOverviewTitle:"Overview",
    docsOverviewBody: "GiuPay is a decentralized escrow payment platform on Arc Testnet. Any shop can sell and accept USDC payments, while buyers are protected by smart-contract escrow: funds don't go straight to the shop but are held for 14 days - enough time to spot issues and open a dispute if needed.",

    docsBuyerTitle:   "For buyers",
    docsBuyer1Title:  "Connect wallet & browse",
    docsBuyer1Desc:   "Connect your wallet (no account or password needed), browse shops and products, and read reviews from previous buyers.",
    docsBuyer2Title:  "Pay",
    docsBuyer2Desc:   "Pay directly in USDC on Arc, or bridge USDC in from Ethereum, Base, Arbitrum, or OP Sepolia via Circle's CCTP - funds land straight into the right order on Arc.",
    docsBuyer3Title:  "Funds go into escrow",
    docsBuyer3Desc:   "Money doesn't go to the shop right away - it's held in a smart contract for 14 days, giving you time to check the item and respond if something's wrong.",
    docsBuyer4Title:  "Get a warranty SBT",
    docsBuyer4Desc:   "As soon as payment lands in escrow, a non-transferable warranty NFT automatically appears in your profile - it's both proof of purchase and a warranty timer.",
    docsBuyer5Title:  "Review & open a dispute if needed",
    docsBuyer5Desc:   "After receiving the item, you can leave a review. If something's wrong, you can open a dispute anytime within the 14-day escrow window.",

    docsSellerTitle:  "For sellers",
    docsSeller1Title: "Register your shop",
    docsSeller1Desc:  "Fill in your shop's details (name, description, category, return policy) and upload a verification document.",
    docsSeller2Title: "Wait for approval",
    docsSeller2Desc:  "The GiuPay team verifies your identity (usually within 24 hours), then your shop is confirmed on-chain - this is required before buyers can pay you.",
    docsSeller3Title: "List products",
    docsSeller3Desc:  "Add products with a price, photo, and warranty period. Buyers can purchase immediately, no extra step needed from you.",
    docsSeller4Title: "Ship it",
    docsSeller4Desc:  "Update the shipping status so buyers can track it. If a buyer opens a dispute, you can voluntarily refund or wait for GiuPay to resolve it.",
    docsSeller5Title: "Get paid automatically",
    docsSeller5Desc:  "If there's no dispute, funds are automatically released to your wallet after 14 days - no extra action needed.",

    docsEscrowTitle:  "Why escrow",
    docsEscrowBody:   "Escrow holds the buyer's funds in a smart contract instead of sending them straight to the shop, preventing a shop from taking payment without delivering. After 14 days with no dispute, the contract automatically releases the funds to the shop - no admin involved. GiuPay charges a 0.1% fee per transaction, with no other hidden fees.",

    docsWarrantyTitle:"SBT - proof of purchase & warranty",
    docsWarrantyBody: "As soon as an order enters escrow, a soulbound NFT (non-transferable, can't be sold) is automatically minted to the buyer's wallet - no extra signature needed. It records the product name, shop, amount paid, purchase date, and warranty expiry directly on-chain, publicly viewable on a block explorer. If the product has no warranty, the NFT exists forever as proof of purchase; if it does, the NFT is automatically burned once the warranty expires.",

    docsDisputeTitle: "Dispute resolution",
    docsDisputeBody:  "While funds are still in escrow (within 14 days), a buyer can open a dispute if an item is defective, not as described, or never arrived. The shop can voluntarily refund to resolve it quickly. If the two sides can't agree, the GiuPay team reviews evidence from both and makes a final call - refunding the buyer or releasing funds to the shop. Every decision is recorded on-chain.",

    docsReviewChatTitle:"Reviews & chat",
    docsReviewChatBody:"Once an order is complete, buyers can leave a review (star rating + comment) shown publicly on the shop's page, helping future buyers. Buyers and shops can also message each other directly in the app about an order.",

    // Table of contents (sidebar)
    docsTocOverview:  "Overview",
    docsTocBuyers:    "For buyers",
    docsTocSellers:   "For sellers",
    docsTocEscrow:    "Why escrow",
    docsTocWarranty:  "Warranty SBT",
    docsTocDispute:   "Disputes",
    docsTocReviews:   "Reviews & chat",
    docsTocTech:      "Tech stack",
    docsTocContracts: "Deployed contracts",
    docsTocFaq:       "FAQ",

    // Tech stack
    docsTechTitle:        "Tech stack",
    docsTechFrontendLabel:"Frontend",
    docsTechBackendLabel: "Backend",
    docsTechContractsLabel:"Smart contracts",
    docsTechStorageLabel: "Storage",
    docsTechPaymentsLabel:"Payments",

    // Deployed contracts
    docsContractsTitle:  "Deployed contracts (Arc Testnet)",
    docsContractsBody:   "All 3 contracts are verified, with public source code on Arc Explorer.",
    docsContractsViewOn: "View on Arc Explorer",

    // FAQ
    docsFaqTitle:     "Frequently asked questions",
    docsFaq1Q:        "Is this real money or just a simulation?",
    docsFaq1A:        "GiuPay runs on Arc Testnet with testnet USDC, not real money, but every transaction is a real 100% on-chain transaction, nothing is simulated.",
    docsFaq2Q:        "What fee does GiuPay charge?",
    docsFaq2A:        "0.1% per transaction, with no monthly fee or any other hidden cost.",
    docsFaq3Q:        "What happens if a buyer and shop can't agree on a dispute?",
    docsFaq3A:        "The GiuPay team reviews evidence from both sides and makes a final on-chain decision - refunding the buyer or releasing funds to the shop.",
    docsFaq4Q:        "Is GiuPay live on mainnet?",
    docsFaq4A:        "Not yet. GiuPay currently runs on Arc Testnet and is still being actively developed.",
    docsFaq5Q:        "Does the warranty SBT disappear when the warranty ends?",
    docsFaq5A:        "If the product has a warranty period, the SBT is automatically burned once it expires. If the product has no warranty, the SBT exists forever as proof of purchase.",
    docsFaq6Q:        "Can I pay from a chain other than Arc?",
    docsFaq6A:        "Yes. Besides paying directly in USDC on Arc, you can bridge USDC in from Ethereum, Base, Arbitrum, or OP Sepolia via Circle's CCTP.",
  },
} as const;

export type TranslationKeys = keyof typeof translations.vi;
export type Translations = typeof translations.vi;