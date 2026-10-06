const express = require('express');
const pool = require('../db');
const router = express.Router();
async function ensureAdminTable(){await pool.query(`CREATE TABLE IF NOT EXISTS admins(id INT AUTO_INCREMENT PRIMARY KEY,username VARCHAR(100) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,active TINYINT(1) DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);}
function auth(req,res,next){if(!req.session.adminId)return res.status(401).json({message:'관리자 로그인이 필요합니다.'});next();}
router.use(auth);

router.get('/dashboard',async(req,res)=>{try{const [[countries]]=await pool.query('SELECT COUNT(*) count FROM countries');const [[regions]]=await pool.query('SELECT COUNT(*) count FROM regions');const [[cities]]=await pool.query('SELECT COUNT(*) count FROM cities');const [[areas]]=await pool.query('SELECT COUNT(*) count FROM areas');const [[restaurants]]=await pool.query('SELECT COUNT(*) count FROM restaurants WHERE active=1');const [[places]]=await pool.query('SELECT COUNT(*) count FROM travel_places WHERE active=1');const [[users]]=await pool.query('SELECT COUNT(*) count FROM users WHERE active=1');res.json({countries:countries.count,regions:regions.count,cities:cities.count,areas:areas.count,restaurants:restaurants.count,places:places.count,users:users.count});}catch(e){res.status(500).json({message:e.message});}});
router.get('/countries',async(req,res)=>{try{const[r]=await pool.query('SELECT * FROM countries ORDER BY name');res.json(r);}catch(e){res.status(500).json({message:e.message});}});
router.post('/countries',async(req,res)=>{try{const{code,name,currency='KRW'}=req.body;if(!code||!name)return res.status(400).json({message:'code와 name은 필수입니다.'});const[r]=await pool.query('INSERT INTO countries(code,name,currency) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),currency=VALUES(currency),id=LAST_INSERT_ID(id)',[code,name,currency]);res.json({id:r.insertId,existing:r.affectedRows===2,message:r.affectedRows===2?'이미 등록된 국가 정보를 사용했습니다.':'국가 등록 완료'});}catch(e){res.status(500).json({message:e.message});}});
router.get('/regions',async(req,res)=>{try{const[r]=await pool.query('SELECT r.*,c.name country_name FROM regions r JOIN countries c ON c.id=r.country_id ORDER BY c.name,r.name');res.json(r);}catch(e){res.status(500).json({message:e.message});}});
router.post('/regions',async(req,res)=>{try{const{country_id,name,type='province'}=req.body;if(!country_id||!name)return res.status(400).json({message:'국가와 지역명은 필수입니다.'});const [exists]=await pool.query('SELECT id FROM regions WHERE country_id=? AND name=? LIMIT 1',[country_id,name]);if(exists.length)return res.json({id:exists[0].id,existing:true,message:'이미 등록된 지역입니다.'});const[r]=await pool.query('INSERT INTO regions(country_id,name,type) VALUES(?,?,?)',[country_id,name,type]);res.json({id:r.insertId,message:'지역 등록 완료'});}catch(e){res.status(500).json({message:e.message});}});
router.get('/cities',async(req,res)=>{try{const[r]=await pool.query('SELECT c.*,r.name region_name,r.country_id FROM cities c JOIN regions r ON r.id=c.region_id ORDER BY r.name,c.name');res.json(r);}catch(e){res.status(500).json({message:e.message});}});
router.post('/cities',async(req,res)=>{try{const{region_id,name}=req.body;if(!region_id||!name)return res.status(400).json({message:'지역과 도시명은 필수입니다.'});const [exists]=await pool.query('SELECT id FROM cities WHERE region_id=? AND name=? LIMIT 1',[region_id,name]);if(exists.length)return res.json({id:exists[0].id,existing:true,message:'이미 등록된 도시입니다.'});const[r]=await pool.query('INSERT INTO cities(region_id,name) VALUES(?,?)',[region_id,name]);res.json({id:r.insertId,message:'도시 등록 완료'});}catch(e){res.status(500).json({message:e.message});}});
router.get('/areas',async(req,res)=>{try{const[r]=await pool.query('SELECT a.*,c.name city_name FROM areas a JOIN cities c ON c.id=a.city_id ORDER BY c.name,a.name');res.json(r);}catch(e){res.status(500).json({message:e.message});}});
router.post('/areas',async(req,res)=>{try{const{city_id,name}=req.body;if(!city_id||!name)return res.status(400).json({message:'도시와 상권명은 필수입니다.'});const [exists]=await pool.query('SELECT id FROM areas WHERE city_id=? AND name=? LIMIT 1',[city_id,name]);if(exists.length)return res.json({id:exists[0].id,existing:true,message:'이미 등록된 상권입니다.'});const[r]=await pool.query('INSERT INTO areas(city_id,name) VALUES(?,?)',[city_id,name]);res.json({id:r.insertId,message:'상권 등록 완료'});}catch(e){res.status(500).json({message:e.message});}});
router.get('/restaurants',async(req,res)=>{try{const[r]=await pool.query(`SELECT r.*,c.name country_name,rg.name region_name,ci.name city_name,a.name area_name FROM restaurants r JOIN countries c ON c.id=r.country_id JOIN regions rg ON rg.id=r.region_id JOIN cities ci ON ci.id=r.city_id LEFT JOIN areas a ON a.id=r.area_id ORDER BY r.id DESC`);res.json(r);}catch(e){res.status(500).json({message:e.message});}});
router.post('/restaurants',async(req,res)=>{try{const d=req.body;const sql=`INSERT INTO restaurants(country_id,region_id,city_id,area_id,name,category,price_min,price_max,address,latitude,longitude,lunch_start,lunch_end,break_start,break_end,meal_minutes,solo_ok,group_ok,main_menu,description,phone,rating,review_count,image_path,google_place_id,open_days,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`;const[r]=await pool.query(sql,[d.country_id,d.region_id,d.city_id,d.area_id||null,d.name,d.category||'기타',d.price_min||0,d.price_max||0,d.address||'',d.latitude||null,d.longitude||null,d.lunch_start||'11:00',d.lunch_end||'15:00',d.break_start||null,d.break_end||null,d.meal_minutes||60,d.solo_ok?1:0,d.group_ok?1:0,d.main_menu||'',d.description||'',d.phone||'',d.rating||0,d.review_count||0,d.image_path||null,d.google_place_id||null,d.open_days||'1,2,3,4,5,6,7']);res.json({id:r.insertId});}catch(e){res.status(500).json({message:e.message});}});
router.get('/places',async(req,res)=>{try{const[r]=await pool.query(`SELECT p.*,c.name city_name FROM travel_places p JOIN cities c ON c.id=p.city_id ORDER BY p.id DESC`);res.json(r);}catch(e){res.status(500).json({message:e.message});}});

// Google Places(New)에서 실제 장소를 가져와 DB에 저장합니다. API 키가 있을 때만 동작합니다.
router.post('/sync-google-places',async(req,res)=>{
  const key=process.env.GOOGLE_MAPS_API_KEY;
  if(!key)return res.status(400).json({message:'GOOGLE_MAPS_API_KEY가 .env에 없습니다.'});
  try{
    try{ await pool.query("ALTER TABLE travel_places ADD COLUMN google_place_id VARCHAR(200) NULL"); }catch(_){}
    const cityId=Number(req.body.city_id), cityName=String(req.body.city_name||'').trim(), country=String(req.body.country_code||'KR');
    if(!cityId||!cityName)return res.status(400).json({message:'city_id와 city_name이 필요합니다.'});
    const [cityRows]=await pool.query(`SELECT c.id city_id,c.region_id,r.country_id FROM cities c JOIN regions r ON r.id=c.region_id WHERE c.id=? LIMIT 1`,[cityId]);
    if(!cityRows.length)return res.status(404).json({message:'도시를 찾을 수 없습니다.'});
    const q=[['restaurant',`${cityName} 맛집`],['cafe',`${cityName} 카페`],['attraction',`${cityName} 관광지`],['hotel',`${cityName} 호텔`]];
    let restaurantCount=0,placeCount=0;
    for(const [type,textQuery] of q){
      const body={textQuery,languageCode:'ko',regionCode:country};
      const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.currentOpeningHours,places.priceLevel,places.googleMapsUri'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      if(!r.ok){const t=await r.text();let msg=`Google Places ${r.status}: ${t.slice(0,300)}`;if(r.status===400&&/API_KEY_INVALID|API key not valid/i.test(t)) msg='Google Maps Platform API Key가 유효하지 않습니다. .env의 GOOGLE_MAPS_API_KEY를 실제 Google Maps Platform 키로 교체하고 Places API (New)를 활성화한 뒤 서버를 재시작하세요.';throw new Error(msg);}
      const data=await r.json();
      for(const p of (data.places||[])){
        const name=p.displayName?.text||'이름 없음', lat=p.location?.latitude, lon=p.location?.longitude;
        if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        const rating=Number(p.rating||0), reviews=Number(p.userRatingCount||0), address=p.formattedAddress||'', placeId=p.id||null;
        const hours=p.currentOpeningHours?.weekdayDescriptions?.join(' / ')||'';
        const openNow=p.currentOpeningHours?.openNow;
        const desc=`Google Places 실제 데이터${openNow===true?' · 현재 영업 중':''}${hours?' · '+hours:''}`;
        if(type==='restaurant'){
          const [exist]=await pool.query('SELECT id FROM restaurants WHERE google_place_id=? LIMIT 1',[placeId]);
          if(exist.length){await pool.query('UPDATE restaurants SET name=?,address=?,latitude=?,longitude=?,rating=?,review_count=?,description=? WHERE id=?',[name,address,lat,lon,rating,reviews,desc,exist[0].id]);}
          else await pool.query(`INSERT INTO restaurants(country_id,region_id,city_id,name,category,price_min,price_max,address,latitude,longitude,lunch_start,lunch_end,meal_minutes,solo_ok,group_ok,main_menu,description,rating,review_count,google_place_id,open_days,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,[cityRows[0].country_id,cityRows[0].region_id,cityId,name,'음식점',0,0,address,lat,lon,'11:00','15:00',60,1,1,'',desc,rating,reviews,placeId,'1,2,3,4,5,6,7']);
          restaurantCount++;
        }else{
          const [exist]=await pool.query('SELECT id FROM travel_places WHERE google_place_id=? LIMIT 1',[placeId]);
          if(exist.length) await pool.query('UPDATE travel_places SET name=?,address=?,latitude=?,longitude=?,rating=?,description=?,active=1 WHERE id=?',[name,address,lat,lon,rating,desc,exist[0].id]);
          else await pool.query(`INSERT INTO travel_places(country_id,region_id,city_id,place_type,name,address,latitude,longitude,rating,description,google_place_id,open_time,close_time,open_days,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,[cityRows[0].country_id,cityRows[0].region_id,cityId,type,name,address,lat,lon,rating,desc,placeId,type==='hotel'?'00:00':'08:00',type==='hotel'?'23:59':'21:00','1,2,3,4,5,6,7']);
          placeCount++;
        }
      }
    }
    res.json({ok:true,city:cityName,restaurants:restaurantCount,places:placeCount,message:'Google Places 실제 데이터를 동기화했습니다.'});
  }catch(e){console.error('[GOOGLE SYNC]',e);res.status(502).json({message:'실제 장소 데이터를 가져오지 못했습니다.',detail:e.message});}
});
module.exports=router;
