const steps=['Khảo sát khu đất','Thiết kế phương án','Dự toán chi phí','Thi công','Bàn giao'];

export default function ConstructionProcess(){
 return <section>
  <h2>QUY TRÌNH HOLA HOUSE</h2>
  {steps.map((step,index)=><div key={step}>{index+1}. {step}</div>)}
 </section>;
}
