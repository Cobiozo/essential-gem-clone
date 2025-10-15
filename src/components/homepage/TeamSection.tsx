import React from 'react';
import dropletIcon from '@/assets/pure-life-droplet.png';

const TeamSection = () => {
  const features = [
    {
      title: 'Pasja',
      description: 'Wierzymy w siłę naturalnych suplementów i ich wpływ na zdrowie'
    },
    {
      title: 'Społeczność',
      description: 'Tworzymy zespół profesjonalistów wspierających się nawzajem'
    },
    {
      title: 'Misja',
      description: 'Naszym celem jest poprawa jakości życia przez edukację zdrowotną'
    }
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-black">ZESPÓŁ "PURE LIFE"</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Jesteśmy grupą entuzjastów zdrowia naturalnego, którzy wierzą w moc wysokiej jakości suplementów omega-3. 
            Nasza misja to dzielenie się wiedzą i wspieranie Cię w budowaniu swojej kariery.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center">
                  <img src={dropletIcon} alt="" className="w-10 h-10" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
