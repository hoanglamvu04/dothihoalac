const groups = [
  ['Kiến trúc','Biệt thự','Nhà vườn','Homestay'],
  ['Thi công','Phần thô','Kết cấu','Hoàn thiện'],
  ['Nội thất','Gỗ','Nhôm kính','Thiết bị'],
  ['Kỹ thuật','Điện','Nước','Smart Home'],
  ['Ngoại thất','Sân vườn','Cổng','Tiểu cảnh'],
  ['Dịch vụ','Xin phép','Dự toán','Giám sát'],
];

export default function ContractorGrid(){
 return <section className="contractor-grid">
  {groups.map(group=><article key={group[0]}>
   <h3>{group[0]}</h3>
   {group.slice(1).map(item=><p key={item}>{item}</p>)}
  </article>)}
 </section>;
}
