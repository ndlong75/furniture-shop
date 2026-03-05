-- Seed: Products
INSERT INTO products (category_id, name, slug, description, price, stock_quantity, images, attributes) VALUES
-- Sofa (category 1)
(1, 'Sofa Da Thật Venezia 3 Chỗ', 'sofa-da-that-venezia-3-cho',
 'Sofa da thật cao cấp nhập khẩu Italy, khung gỗ sồi chắc chắn, nệm mút Memory Foam. Thiết kế sang trọng, phù hợp phòng khách hiện đại.',
 18500000, 15,
 '["https://placehold.co/800x600/8B6914/white?text=Sofa+Venezia"]',
 '{"color": "Nâu cognac", "material": "Da thật Italy", "dimensions": "220x90x85cm", "weight": "65kg"}'),

(1, 'Sofa Vải Bố Nordic 2 Chỗ', 'sofa-vai-bo-nordic-2-cho',
 'Sofa phong cách Bắc Âu, chân gỗ óc chó tự nhiên, vải bọc bố dày dặn chống bám bẩn. Gọn nhẹ, phù hợp căn hộ.',
 8900000, 22,
 '["https://placehold.co/800x600/6B7280/white?text=Sofa+Nordic"]',
 '{"color": "Xám nhạt", "material": "Vải bố", "dimensions": "160x80x80cm", "weight": "38kg"}'),

-- Chair (category 2)
(2, 'Ghế Văn Phòng Ergonomic Pro', 'ghe-van-phong-ergonomic-pro',
 'Ghế văn phòng công thái học, tựa lưng điều chỉnh 135°, đệm ngồi 3D, tay vịn 4D. Phù hợp ngồi làm việc 8+ giờ.',
 5600000, 30,
 '["https://placehold.co/800x600/1F2937/white?text=Ergonomic+Chair"]',
 '{"color": "Đen", "material": "Lưới mesh + kim loại", "dimensions": "68x65x115-125cm", "weight": "18kg"}'),

(2, 'Ghế Ăn Gỗ Tần Bì Scandinavian', 'ghe-an-go-tan-bi-scandinavian',
 'Ghế ăn gỗ tần bì nguyên khối, đệm ngồi nhung mềm, chân gỗ thon. Set 4 ghế giảm 10%.',
 2200000, 48,
 '["https://placehold.co/800x600/92400E/white?text=Dining+Chair"]',
 '{"color": "Gỗ tự nhiên / Đệm kem", "material": "Gỗ tần bì + vải nhung", "dimensions": "45x50x82cm", "weight": "6kg"}'),

-- Table (category 3)
(3, 'Bàn Ăn Marble Trắng 6 Người', 'ban-an-marble-trang-6-nguoi',
 'Bàn ăn mặt đá marble tự nhiên Ý, chân inox mạ vàng. Sang trọng và dễ vệ sinh, kháng nhiệt và chống trầy.',
 22000000, 8,
 '["https://placehold.co/800x600/E5E7EB/333?text=Marble+Table"]',
 '{"color": "Trắng vân xám", "material": "Đá marble + Inox 304", "dimensions": "180x90x75cm", "weight": "85kg"}'),

(3, 'Bàn Làm Việc Gỗ Solid Oak L-Shape', 'ban-lam-viec-go-oak-l-shape',
 'Bàn làm việc hình chữ L, gỗ sồi nguyên tấm 40mm, nhiều ngăn kéo tích hợp. Phù hợp home office.',
 7800000, 12,
 '["https://placehold.co/800x600/78350F/white?text=Desk+Oak"]',
 '{"color": "Gỗ sồi tự nhiên", "material": "Gỗ sồi nguyên khối", "dimensions": "160x120x75cm", "weight": "52kg"}'),

-- Bed (category 4)
(4, 'Giường Platform Upholstered Queen', 'giuong-platform-upholstered-queen',
 'Giường bọc vải nhung xanh navy, đầu giường cao 120cm, khung gỗ thông nhập khẩu. Không cần box spring.',
 12500000, 10,
 '["https://placehold.co/800x600/1E3A5F/white?text=Platform+Bed"]',
 '{"color": "Navy blue", "material": "Vải nhung + Gỗ thông", "dimensions": "160x200cm (Queen)", "weight": "72kg"}'),

(4, 'Giường Gỗ Tràm Rustic King Size', 'giuong-go-tram-rustic-king',
 'Giường phong cách rustic, gỗ tràm tự nhiên xử lý chống mối mọt, màu nâu ấm. Kích thước King 180x200cm.',
 9200000, 6,
 '["https://placehold.co/800x600/713F12/white?text=Rustic+Bed"]',
 '{"color": "Nâu gỗ tự nhiên", "material": "Gỗ tràm", "dimensions": "180x200cm (King)", "weight": "68kg"}'),

-- Storage (category 5)
(5, 'Tủ Quần Áo 4 Cánh Walnut', 'tu-quan-ao-4-canh-walnut',
 'Tủ quần áo gỗ óc chó 4 cánh, bên trong 2 ngăn treo và 4 ngăn kệ, gương tích hợp. Tay nắm mạ vàng.',
 16800000, 7,
 '["https://placehold.co/800x600/292524/white?text=Wardrobe+Walnut"]',
 '{"color": "Walnut tối", "material": "Gỗ óc chó + Kính", "dimensions": "200x60x220cm", "weight": "95kg"}'),

(5, 'Kệ Sách Floating Modular 5 Tầng', 'ke-sach-floating-modular-5-tang',
 'Kệ sách treo tường modular, có thể tùy chỉnh bố cục. Gỗ MDF chống ẩm, tải trọng 25kg/tầng.',
 3200000, 25,
 '["https://placehold.co/800x600/374151/white?text=Bookshelf"]',
 '{"color": "Trắng", "material": "MDF phủ melamine", "dimensions": "100x25x200cm (5 tầng)", "weight": "22kg"}'),

-- Decor (category 6)
(6, 'Đèn Sàn Arc Minimalist', 'den-san-arc-minimalist',
 'Đèn sàn hình vòng cung phong cách tối giản, đầu đèn xoay 360°, bóng LED 15W kèm theo. Chân marble đen.',
 2800000, 20,
 '["https://placehold.co/800x600/111827/white?text=Arc+Lamp"]',
 '{"color": "Vàng đồng + Marble đen", "material": "Kim loại + Đá marble", "dimensions": "Cao 175cm", "weight": "8kg"}'),

(6, 'Gương Tròn Khung Rattan Boho 80cm', 'guong-tron-khung-rattan-boho-80cm',
 'Gương trang trí tròn đường kính 80cm, khung mây tự nhiên đan thủ công. Phong cách boho nhiệt đới.',
 1450000, 35,
 '["https://placehold.co/800x600/D97706/white?text=Rattan+Mirror"]',
 '{"color": "Mây tự nhiên", "material": "Kính + Mây rattan", "dimensions": "Đường kính 80cm", "weight": "3.5kg"}');
