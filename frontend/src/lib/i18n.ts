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
  },
} as const;

export type TranslationKeys = keyof typeof translations.vi;
export type Translations = typeof translations.vi;