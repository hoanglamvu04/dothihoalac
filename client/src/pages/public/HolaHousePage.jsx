import HolaHouseHero from '../../components/hola-house/HolaHouseHero';
import ContractorGrid from '../../components/hola-house/ContractorGrid';
import ConstructionProcess from '../../components/hola-house/ConstructionProcess';

export default function HolaHousePage() {
  return (
    <main className="hola-house-page">
      <HolaHouseHero />
      <ContractorGrid />
      <ConstructionProcess />
    </main>
  );
}
