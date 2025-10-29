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
    <section className="py-12 px-4 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-6 text-foreground uppercase tracking-wide">
            Zespół "Pure Life"
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            Jesteśmy grupą entuzjastów zdrowia naturalnego, którzy wierzą w moc wysokiej jakości suplementów omega-3. 
            Nasza misja to dzielenie się wiedzą i wspieranie Cię w budowaniu swojej kariery.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="text-center group hover:transform hover:scale-105 transition-all duration-300"
            >
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <img src={dropletIcon} alt="" className="w-12 h-12" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
