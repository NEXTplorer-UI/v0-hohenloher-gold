// Script to import customer data from CSV
// Schema: Spalte C = Nachname Vorname, Spalte D = Email, Spalte E = Adresse (Straße, Hausnummer, PLZ, Ort, Telefon)

import { createClient } from "@supabase/supabase-js"
;(async () => {
  console.log("[v0] Script started - initializing...")

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("[v0] Environment check:")
  console.log("[v0] SUPABASE_URL exists:", !!supabaseUrl)
  console.log("[v0] SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseKey)

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] ERROR: Missing environment variables!")
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log("[v0] Supabase client created successfully")

  const customerData = `
Allton;Falk hansotto;hansotto.falk@blumengartenfalk.de;
Allton;Hausser silke;hausser@allton.de;"Wiesenweg 1, D - 34596 Bad Zwesten, Telefon:	+49-06693-8350"
Allton;wittern margret ;familie-wittern@t-online.de;kellerwaldstraße 20,34537 Bad Wildungen, 05626-356
Allton ;Kadel Ralf;ralf.kadel@web.de;an den tannen 3, 34613 Schwalmstadt , 15780835806
Allton_B;Baumann Beatrix;info@mitleibundseele-kirchheim.de;Jahnstr.1, 36275 Kirchheim, 0151 15 60 19 75
Allton_H;Herbst Anette;oelmanufaktur-waldhessen@posteo.de;Eisenbergstrasse 14, 36251 Bad Hersfeld, Tel  0 66 21 – 80 12 410
Allton_S;gruber kerstin;Gruber@hwk2.de;amselweg 7, 34582 Borken, 016094152344
Allton_S;Kunz petra;Kunz@hwk2.de;Am Weinfeld 15, 34599 Neuental, 0177 3364047 
Allton_S;scaparra malte;mscaparra@t-online.de ;mscaparra@t-online.de 
Allton_T;Thöne Vera;verathoene1407@gmail.com;"Bahnhofstraße 45\n34632 Jesberg \n0151/16861846"
BK;Aldinger Brigitte;Brigitte.Aldinger@web.de;"Espenweg 12,\n73614 Schorndorf, 01722098721"
BK;eckert edith;edith.eckert@web.de;Filsstr. 9, 71576 erbstetten, 01707758272
BK;eltolony sheila;sheila.eltolony@gmx.de;
BK;frintrup mechthild;andas.werkstatt@gmail.com ;marbacher str. 25, 71576 Burgstetten, Burgstall, 0176 81537036
BK;Häussler-Hipp;H.Haeussler-Hipp@gmx.net ;unter der Steige 1, 71576 Burgstetten, 015228704844
BK;Heer marcel;heermarcel@web.de;Bahnhofstraße 5/1, 71717, Beilstein ,17632672677
BK;Herzog Achim ;achim.herzog@web.de;Johann-Michael-Knapp-Weg 10, 71522 Backnang, 0160 7022700
BK;Herzog Achim ;achim@herzogpictures.de ;Johannnn-michael-knapp-weg 10, 71522 Backnang, 01607022700
BK;Hirsch Gerd;kontakt@gerdhirsch.de;H-Heine-Str. 12, 71717 Beilstein, BW ,0172 7657717
BK;kaiser andrea;and.kaiser@gmx.de;Kirchenweg1, 71576 burgstetten, 017631662670
BK;Krautter christine;c.krautter@arcor.de ;Austr. 11, 71576 Burgstetten, 07191-3804642
BK;Kuriger susanne;s_kuriger@arcor.de;steigäckerstr. 43, 71672 Marbach, 01573 6742897
BK;laich ellie;yvonne.ulrich1983@web.de;elbingerstr. 35, 71570 Oppenweiler, 01732374179
BK;Landsgesell Beatrix;sheila.eltolony@gmx.de;Berliner straße 55, 71540 Murrhardt, 0176-60129710
BK;latzl brigitte;die.latzls@yahoo.de;wiener straße 3, 71522 Backnang, 004917678394606
BK;lila astrid;alilla@posteo.de ;wiesbadener str. 16, 70372 Stuttgart, +49 177 7482414
BK;scheffler ulrike ;ulrike-scheffler@t-online.de ;Oberroter str. 18, 74420 Oberrot – Wolfenbrück, O7977 - 911704
BK;Sonnenfrüchtchen Hans Georg;hans-georg.wagner@posteo.de;"Burgweg 22\n71576 Burgstetten"
BK;sorg josua;josua.sorg@posteo.de;hintere gasse 13, 71701 schwieberdingen, 015757983772
BK;Stettner Anna-lena;annalenastettner@posteo.de ;Hauffweg 9, 71560 Sulzbach, 015126143918
BK;tensing irina;I.tensing@posteo.de;Rathaus Straße 44, 71576 Burgstetten 
BK;zehden hendrik;hendrik.j@icloud.com ;Marbacherstr. 12, burgstetten, 0173/ 41 80 947
CS;Bammes julia;julia.bammes@web.de ;Roggenhoferweg 16, 87634 Obergünzburg, 01706655517
CS;Bickel Marion und Alfred ;alfion@t-online.de ;Kemptener str. 7, 87634 Obergünzburg, 0152 08282342 
CS;binzer heidi;ChristinaMariaSchindele@gmx.de;Obermelden 7, 87643 Obergünzburg, 0179 2170040
CS;deli sabrina;Sabrina.Deli@gmx.de ;am alpenblick 8, 87653 eggenthal, 01715279262
CS;epple barbara;babsiepple@gmail.com;webams 3, 87653 Eggenthal, 0173 2449853
CS;feneberg sarah;sarah.feneberg@gmx.de;falkenweg 20, 87634 Willofs, 01520 6424162, 
CS;fleschhut petra;andrea.fleschhut28@gmail.com ;Binkenhofen 1, 87634 Obergünzburg, Deutschland, 083067512
CS;heindel regina;regina-waibel@web.de;öschweg 10, 87634 Obergünzburg, 08372-2639
CS;Högg Martin;ChristinaMariaSchindele@gmx.de;87634 Ebersbach/Allgäu, 01512 5590119
CS;Horber Sandra;sandra.herzlicht.5@posteo.de;Mindeltalstraße 23, 87634 Obergünzburg, 0157 38090594
CS;immle Heidi;immleheidi@googlemail.com ;Untermelden5, 87634 obergünzburg, 0176 56824920
CS;Mersini skifter;smersi@hotmail.de;schumacherring 86, 87437 kempten, 017670426699
CS;panje christine;christina.panje@gmx.de ;im maiengrung 21, 87650 Baisweil, DE, 0177 – 6480931
CS;plaschke monica;moni@toni-klimm.de ;Ziegelweg 23, 87660 irsee, 015150655605
CS;rauch simone;rauch.simi@hotmail.com;Pfänder 1, 87634 Obergünzburg, 083727691
CS;schindele birgit;BirgitSchindele@gmx.de ;Industriestr. 35 - 37, 87748 Waltenhofen, 015237683403
CS;schindele stefan u freya;info@brunft.eu ;Hauptstr. 15, 87634 Ebersbach/Obergünzburg, 0151 5562 5919
CSAb;Gisela;ChristinaMariaSchindele@gmx.de;74629 Oberhöfen
CSAb;Hauck Fabian , Roth Kerstin;Fabian.Hauck@foerch.de;Sonnenbergstr.15, 74613 Michelbach, Kerstin.Roth82@gmx.net
CSAb;Reichert Simone;ChristinaMariaSchindele@gmx.de ;Langenbeutingen
CSAb;Roth Kerstin;Kerstin.Roth82@gmx.net;Sonnenbergstr.15, 74613 Michelbach, 0160-4471001
CSAb;schindele christina;ChristinaMariaSchindele@gmx.de ;Steinbacher-Tal-Str. 19, 74629 Pfedelbach-Oberohrn, Deutschland, 0171 3623753
CSAb;torrisi viola;ChristinaMariaSchindele@gmx.de;74626 Bretzfeld-Waldbach, 017645672101
CSAb;weippert tine ;Tinecrazy@web.de ;Gartenbühlstraße 3, 74613 Öhringen, 01736735930
EN;bach norbert;noba@gmx.de;mühlstr. 4, 97990 weikersheim, 017678202239
EN;Beck martina;martina@b-e-c-k.de ;am sonnenhang 10, 97996 Niederstetten, 07932/606300
EN;bender christine;bendermeier@web.de;Rehhof 2, 97996 Niederstetten, 079326061415
EN;Burger AnnMarie;annmarie.burger@buntspechte.de;"97993 Creglingen\nFon 07933 1478"
EN;Denninger luise;luise.denninger@gmail.com;luise.denninger@anserina.de
EN;Denninger luise;luise.denninger@web.de;" Luise Denninger\nAm Markt 8 \n97990 Weikersheim\n\nTel: 07934/8925 "
EN;Diehm erika;helga.wolfarth@web.de;apfelbach, 07931 9589733
EN;dietzel roland;rol.dietzel1@web.de;frankenstr. 24, 97944 boxberg, 017657676961
EN;dimler ida;ida.dimler@gmail.com;Pfitzingen 34, 97996 niederstetten, 07932 8624
EN;döppert herbert;herbert.doeppert@gmx.de ;Niederrimbach 35, 97993 Creglingen, 015204586529
EN;Eckert-Hausch Christine;c.eckert.hausch@googlemail.com;Bahnhofstraße 22, 97990 weikersheim, 07934 1459
EN;Fleck Sonja;sogoni@gmx.net;Weinsteige 32, 97996 Niederstetten, 07932 604337
EN;grieser ulrika;ulrikagrieser@aol.com ;Pfitzingen 51, 97996 Niederstetten, 07932-7875 
EN;Haag renate ;reni.haag@unity-mail.de;"Höckersteige 7\n97996 Niederstetten \nO7932604404 "
EN;Hauck martina;mabesto@gmx.de;Niederrimbach 46, 97993 creglingen, 07933-7438
EN;Hauck martina;martinabeckstoll@gmail.com;Niederrimbach 46, 97993 creglingen, 07933-7438
EN;Heilmann erika;Heilmannclan5@gmx.de;Wermutshausen 96, 97996 Niederstetten, 07932-7667
CS;binzer heidi;heidi.binzer@t-online.de;Obermelden 7, 87643 Obergünzburg, 0176/21997048
EN;Herzer manuela;herzer.manuela@t-online.de ;Frickentalstr. 29, 97996 Niederstetten, 015902125308
EN;horn sonja;sonjasonnefriede@arcor.de;Lindenstr. 16, 97996 niederstetten, 079328160
EN;Ibowski Dieter;Dieter.Ibowski@web.de;Bahnhofstr. 48, niederstetten, 07932-606176
EN;Kaiser-pollok sabine;sabine-kaiser-pollok@t-online.de ;Elberweg 9, 97996 Niederstetten, +497932/7154 
EN;Kauffmann rolf;rolf.kauffmann@googlemail.com;"Sonnenstraße 22\n97990 Weikersheim\nTel.: 07934 / 9952960"
EN;Kettemann reinhild;kettemaennin@online.de;Blaufeldenerstraße 30, 74582 Gerabronn, 01783026194
EN;Knolmayer Sabine ;s.knolmayer@gmx.de;schlesierstr. 12, 97999 Igersheim, 07931- 42873
EN;Krax Brigitte;krax-finsterlohr@t-online.de;"Finsterlohr 37 \n97993 Creglingen"
EN;krummrein Yvonne;anne.krummrein@gmx.de ;biegelgasse 2, 97993 Creglingen, 016094731320
EN;küstner Herbert u. Renate;herbert.kuestner@arcor.de ;Sudetenstr. 5, D- 97999 Igersheim, 07931  968253
EN;loeblein silvia;loeblein-eichhof@t-online.de ;Eichhof 12/1, 97996 Niederstetten, 07932224
EN;mohr brigitte;gittemohr@t-online.de ;Niederrimbach 34,97993 Creglingen, 97993 Creglingen
EN;Niesel eva;eva.niesel@web.de;Münzgasse 9, 97996 Niederstetten, 0157 88 19 79 26 
EN;popp sonja;s.menzke@gmx.de ;Sperrlohestr. 25, 97996 Niederstetten, 07932 8360
EN;Rösser claudia;roesserclaudia@gmail.com ;Eiersheim 
EN;Röttler Bernhard;b.ruettler@kabelbw.de;im kirchweinberg 21, 97980 Bad Mergentheim, 015207570884
EN;Scheu-hachtel;scheu-hachtel@t-online.de;Wermutshausen 43, 97996 Niederstetten, 01732 8365
EN;Schmitt Tim;lucky.schmitti@gmail.com;
EN;Schmitt Ulrike;locke.glatt@web.de;Finkenweg 10, 97996 Niederstetten, 0175 4406946
EN;Schulz Roland & Simone;rosim.schulz@gmx.de;Ahornweg 16, 97996 Niederstetten, 015110753921
EN;siebert tatjana;t.siebert@ev-heimstiftung.de;Burgstrasse 20, 97999 igersheim, 0173-3110956
EN;stoschus heide;heide.stoschus@web.de;"Eichhof 23\n97996 Niederstetten\nTel.: 07932 - 273"
EN;Striffler Jürgen;striffler@kabelbw.de;Zaisenhäuser Weg 2, 97996 Niederstetten, 1742615926
EN;Stroh Alexander;hp.alexanderstroh@gmail.com;Feldertor 17/1 , 97990 Schäftersheim, 0160 2096616
EN;treml heike;whjje@gmx.de ;97990 Weikersheim, von Hatzfeldstrasse 16, 015175084847
EN;vollkommer roswitha;amro.vollkommer@t-online.de;Bahnhofstr. 36, 97996 Niederstetten, 07932 234
EN;Weber-Roth cornelia;cornelia.u.roth@t-online.de ;Römergasse 3, 97996 Niederstetten, 0174/4848441
EN;Wolfarth helga;helga.wolfarth@web.de;An der Romantischen Str.29, 97990 weikersheim, 07934 3412
EN;Wüstenhagen SaNDRA;Masa77@gmx.de;im ganswasen 27,97996 Niederstetten, 01702412820
ESW;bindewald charlotte;ch.bindewald@gmail.com;"Bachtelmühlstraße 51\n87437 Kempten\nTel. 0831-74609295"
ESW;blanz anna;akblanz@yahoo.de;linggener str. 83, 87471 Durach, D, 0151 25 152 152
ESW;brkic sanja;sanja.brkic@t-online.de;mühlhaldeweg 29, 87509 Immenstadt, +49 8323 8084413
ESW;erhart johanna;johannaerhart2@gmail.com ;Gutenbergstraße 2, 87435 Kempten (Allgäu), 015787714410
ESW;erhart johanna , Lackner Ulrich;kurt_walter_waldemar@hotmail.de;Keselsraße 49, 87435 Kempten, 01623082509
ESW;Haggenmüller susanne;shaggenmueller@t-online.de;Bezachmühle 10, 87439 Kempten, 016097357284
ESW;haug daniela;haug.dani@gmail.com;Eisenbolz 7, 87480 Weitnau, 0160/7085140
ESW;kunkel christa;kunkel_christa@t-online.de;Ottaker 26, 87477 sulzberg, 0176-52307593
ESW;Michalik Katharina;katharina.e.michalik@gmail.com;poststraße 32, 87439 Kempten, 015770305670
ESW;Miller Matthias;matthiasmiller1618@gmail.com;Dreiweiherweg 2, 86925 fuchstal, 0176-3895466
ESW;Reißner Carola;carola.reissner@web.de;"Carola Reissner\nLandsbergerstr. 5, 87719 Mindelheim, 0176 96845637"
ESW;Reuter sigrid;s.reu23@gmail.com;Ulrichstr. 20, 87493 Lauben, 017651060795
ESW;rutherford melanie;Melanie.Rutherford@web.de;am göhlenbach 22, 87439 Kempten, 0157 75385213
ESW;strauber Magdalena;magdalena.strauber@gmx.de;Marienstraße 1, 87437 Kempten, 015785682089
ESW;Weiß Andrea;andrea.weiss@kangatraining.de ;am öschle 46, 87752 Holzgünz, 015201678835
ESW;Willaredt Ewa;jil.montaseri@stud.hs-kempten.de;
ESWb;apelt andrea;neleburgthaler@gmail.com;
ESWb;beck Monika;monika.beck1@googlemail.com;Bürgermeister-wild-str.6, 85521 Ottobrunn, 0173 9773846, Autobahn München
ESWb;bernritter ursula;u.griesser@gmail.com;priener str. 37a, 83125 Eggstätt, 0176-22877508
ESWb;Böck Stefanie;missboeck@web.de;am griess 31, 83209 Prien, 01797326236
ESWb;burgthaler heidi;hburgthaler@yahoo.de ;forstau 3, 83530 Schnaitsee, 01606304472
ESWb;Christine Tremel;ctremel65@gmail.com ;Meisenweg 4, 83209 Prien, 015730908331
ESWb;Eberle monika;mail@monikaeberle.com;kurf 10, 83093 Bad Endorf, 0170.3484283
ESWb;egger franz u luise;eggerlu@gmx.de ;Maisenberg 3, 84549 Engelsberg, 08622/768
ESWb;Felber annette;annette.felber@gmx.de;schlossbergstr. 13, 83329 Waging am See, 01705558256
ESWb;grieblinger barbara;BarbaraGrieblinger@web.de;Seestr. 9, 832090805192708
ESWb;göhl anja;neleburgthaler@gmail.com;
ESWb;hartmann petra;petrahartmannbe@t-online.de ;am anger 3,83039 bad endorf, 08053-3819 
ESWb;Hattenkofer Stefanie Alice ;stefanie.hattenkofer@web.de ;hochplattnerstr. 3a, 83209 Prien, 015126718092
ESWb;Hessner stefanie;mechanicalz@yahoo.de;Dorfstraße 15, 84574 Taufkirchen, 0163-8253063
ESWb;hilker kerstin;hilkerstin@web.de ;ambröndl 15b, 83209 Prien, 0177-8336201
ESWb;Höhn ursel;u.goe.hoe@gmail.com ;84559 Kraiburg, 015126718092
ESWb;kern iris;kern.iris@posteo.de;odilostr. 13a, 83026 rosenheim, 015159260206
ESWb;kessner karen ;karenkessner@gmail.com;Schiesssstättenweg4 , 84559 kraiburg, 01791210981
ESWb;korn ulrike;korn.ulrike@gmx.de;83233 bernau am chiemsee, rottauer str. 69, 0171-2689028
ESWb;kristen barbara;barbara.kristen@gmx.de;bergstraße 7, 83093 bad endorf 10, 01734610628
ESWb;laub annette;nette.laub@gmail.com;edelweißstr. 5, 83346 Bergen, 017672875096
ESWb;lenk stefanie;lenkegoesfjutscha@gmx.de ;Unterapfelkam 8, 83101 rohrdorf, 01709030167 
ESWb;mackert brigitte;neleburgthaler@gmail.com;
ESWb;mandl kerstin;neleburgthaler@gmail.com;Fragnerstr. 18, 83224 Grassau, Deutschland, +491736050456
ESWb;Melain Mareike;mareike.melain@gmx.de;Jolling 3, 83093 Bad Endorf, 08053/2099164
ESWb;mitterer sabine ;sabine.mitterer@posteo.de ;Jolling 3, 83093 Bad Endorf, 08053-2099163
ESWb;mutke roswitha;roswithamutke@gmail.com;Ströbinger Str. 8 a, 83093 Bad Endorf, 017622625669
ESWb;Neubauer kirsten;kirsten.neubauer@web.de;otterkring 6b, D-83253 Rimsting, 008051-964874
ESWb;niedermaier renate;Niedermaier.Renate@outlook.de ;Einharting 9, 83567 unterreit, 015155993394
ESWb;ober hans;ober.h@gmx.de;Franking 8, 84574 Taufkirchen
ESWb;panhans steffi;steffi.panhans@outlook.de;torfweg 5a, 83071 stepanskirchen, 017676588818
ESWb;pfeffer olga;o.pfeffer@yahoo.com;walter-mohr-ring 5, 83301 traunreut, 01602804600
ESWb;redel tamara;neleburgthaler@gmail.com;schidenhofer str. 3,83416 saaldorf, +4915124195705
ESWb;reichl michaela;m.reichl@t-online.de ;Mooswiesenweg 5, 84570 Polling, 017669200725
ESWb;roth lukas;luke_roth@yahoo.de ;Jolling 14, 83093 bad endorf, 0151-23586027
ESWb;Röthlein Fredericke;f.roethlein@gmx.net ;Hofkapellenstr. 8, 83250 Marquartstein, 015165162378 
ESWb;Sachsenhauser-Kratzer Hildegard ;sachsenhauser-kratzer@gmx.de;0171 620 92 25 
ESWb;schmell sabine;sabine.schmell@t-online.de;am bröndel 16a, 83209, 015735100966
ESWb;Schmidt-Lanzinger bettina;Bettina.Schmidt-Lanzinger@web.de ;altmöhldorfer str. 1, 84453 Mühldorf, 017655136932
ESWb;Schmidt-Lanzinger bettina;Bettina.Schmidt-Lanzinger@web.de ;altmöhldorfer straße 1, D 84453 Mühldorf, 0176 551 36932
ESWb;stierl susanne;susanne.stierl@gmail.com;Tristanstr. 2, 84453 mühldorf, 015170803473
ESWb;strasser barbara;barbara.strasser@gmx.net;
ESWb;strauss wiltrud;wiltrudstrauss@gmx.de ;Fürstätt 23, 83024 Rosenheim Oberbayern, 08031 24 73 841 
ESWb;tille carolin;Carolin.Tille@web.de;Ludwig-thoma-str. 1, 84570 polling, 01751560795
ESWb;Tine R ;rojtine@hotmail.de ;
ESWb;veritsis mia;8blue8@web.de ;Hochfellnstr. 8b, 83209 Prien, 0174/2899019
ESWb;vielmeier daniela;daniela.vielmeier@gmx.de;Pfarrer-marschall-str. 9, 84513 Töging, 017699980021
ESWb;wendt gitte;gitte.wendt@gmx.de ;Seigweg 2, 83071 Stephanskirchen, 01515 0793921
ESWb;WERNER Karl-Heinz ;kh@khwerner.de;Eschenweg 9, 83209 prien, 01712270560
ESWb;werner sonja;sonjaff@gmx.de ;am bröndel 20a, 83209 prien, 01728997935
ESWb;Willaredt Ewa;Mechanicalz@yahoo.de;
ESWb;willaredt sonia;s.willaredt@t-online.de ;Lenzwald 2, 84570 Polling, 0177-6450103
ESWb;Willaredt, SimchaEwa;ewa.willaredt@posteo.de;Franking 8, 84574 Taufkirchen, 0151-22590581
ESWb;;magrit@solawi-lenzwald.org;
ESWb;;wolfgang_schweiger@me.com_ ;Beethoven str. 6a, 84570 Polling Deutschland, 0174/4848441
ESWHDH;hellwig astrid;astrid.hellwig@gmail.com;germanenstr. 101, 89522 Heidenheim, 017623929073, Autobahn
FaBa;Fallenbacher Christa;kontakt@christafallenbacher.de;Zimmern 20, 91788 Pappenheim, 01704797559
FaBa;Gräfin v.der Recke Raiky;info@von-der-recke.eu;Else-Model-Str. 1  91781 Weißenburg Kontakt: Helga Meyer
FaBa;hunecker christa;christahunecker@t-online.de;ellinger weg 5, 91798 Höttingen, 0151 10 444 304
FaBa;Hunecker, Dieter;dieterhunecker@t-online.de;ellinger weg 5, 91798 Höttingen, 0151 10 444 304
FaBa;Meyer Helga;Helga__Meyer@web.de;Lehenwiesenweg 10a, 91781 Weißenburg, 01714259073, 09141 70314
FaBa;Ranzenberger Ingrid;ranzenberger@wugnet.de;"Dinkelsböhler Str 15 \n91781 Weissenburg ,\nTel. 09141 8732382, \nHandy 0170 3136004"
Geli;Günzel Rainer;rainer-guenzel@t-online.de;
Geli;simon petra;petra.simon65@gmail.com;Auf dem Berg 36, 71543 Wüstenrot Finsterrot, 07945/337031
GF_Tel;Hübner Metzgerei;;Hungerfeld, 74613 Öhringen
KÜN;beer alexandra;alexandra.beer@gmx.de;
KÜN;bort sabrina;ja.walter@gmx.de;Beethovenstr., 74653 Künzelsau, 01629691502
KÜN;Gloger Hannelore;hagloger@web.de;"Amrichshäuser Straße 96\n74653 Künzelsau\nFon: 0 79 40 / 5 77 49"
KÜN;Heinrich, Erika;Wolf-Dieter Heinrich <wodihe@gmx.de> ;Ahornweg 15, 74653 Künzelsau, 079408940
KÜN;Hertrich Irene;familyhertrich@gmx.de;Heilig-Kreuz-Str. 57,  74653 Künzelsau, 07940-6314
KÜN;Lambrecht, sonja;so.lambrecht@t-online.de;am buchs 40, 74653 Künzelsau, 0170 633 8470
KÜN;schwarz christian ;mails@christian-schwarz.de;geranienweg 5, 74653 Künzelsau,  0151-65 63 25 46
KÜN;Vogt Nicole;Info@hochholzhanf.de;"Hochholzhöfe 2/1, 74653 Ingelfingen (D),\n07940-9058184"
KÜN;Vysiotis Hilde;hivysi@hotmail.com ;Mozartstr. 30, 74653 Künzelsau, 07940/55975
KÜN;Walter jasmin;ja.walter@gmx.de;bahnhofstr. 12, 74653 KÜN, 01629691502
KÜN;Weinmann heike;heike.joshi@gmx.de;weißbacher Str. 23, 74679 Crispenhofen, 017647245536
KÜN;Zollmann Ralph;ramafezo@aol.de;geranienweg 3, 74653 Künzelsau,  0163/3950348
KÜN/MGH;Stier;info@verborgenerwinkel.de;Hohenbach, Tel: 07937-803637
MGH;arweiler dieter;darweiler@gmx.de ;Imkirchweinberg 20, 97980 Bad Mergentheim-Stuppach, 07931/2862
MGH;Behringer Gaby;Gaby.Behringer@gmx.de;Heldenstr. 2, 97944 Boxberg, 079302658
MGH;Bohn Gerhard;bohn.ag@gmx.de;Wart 1, 97980 Bad Mergentheim, 07931/483367
MGH;Gass Michael;migass@web.de;Aubstraße 8, 97959 Assamstadt, 0174 9622237
MGH;hügel meinrad;berlinjosef40@web.de;Falkenweg 3, 97980 Bad Mergentheim, 0177 6812523
MGH;Kolberg Jana;jana.kolberg@web.de;"Bregenzer Str. 4\n97980 Bad Mergentheim +49-(0)176-23125848"
MGH;Mittnacht, Sabine;sabinemittnacht@web.de;"Wilhelm-Frank-Str.30, 97980 Bad Mergentheim\n\nTel:   07931/9929720"
MGH;ray katja;kaemray@outlook.de ;97980 MGH, 015787248896
Rose;floor hilde;;
Rose;jäckel ;;finsterrot
SHA;bareiß kathrin;ketterle@gmx.de ;Bachstr. 11, 74426 Bühlerzell, 015141234741
SHA;Beck Angelika;geli.beck61@web.de;Erwin Freitag, Haldenstraße 36, 74523 Schwäbisch Hall (0791-204 151 99) 
SHA;Beck Angelika;geli.beck61@web.de;Horst Ziegler, Im Schönblick 7, 74523 Schwäbisch Hall ( 0791-541669) 
SHA;Becker Ursula;ursula.liselotte.becker@gmail.com;Becker, Am Kreuzstein 29, 74523 Schwäbisch Hall, 0791-9567534
SHA;Bendl Sandra;sbendl@web.de;Steinäcker 1 , 74532 Ilshofen, 01522 9590807
SHA;borchert vera;Vera.j.borchert@gmail.com;mörikestr. 20, 74523 SHA, 017624491498
SHA;Dörr Benjamin;duerrkathi@gmail.com;"Wilhelmweg 3, \n74541 Vellberg, \n0173/974681 "
SHA;Eckstein ralf;ralf.eckstein@t-online.de;In den Hofäckern 17, 74545 Michelfeld, 0791/85 60 39
SHA;Gitzel Katrin;Katrin_Kohler@gmx.net;"Silcherstraße 38,\n74523 Schwäbisch Hall, 0171 - 7749622"
SHA;Knoll sue;sue_64@web.de;Silcherstraß 38, 74523 Schwäb. Hall, 01573 1640330
SHA;Kowalke Sina;sina.kowalke@web.de;am riedgraben 19, 74545 Michelfeld, Deutschland, 0152 274 30 229
SHA;Larsson sigrid;fred-siggi@gmx.de;Ahornweg 2, 74532 Ilshofen-Eckartshausen, 07904-307354 
SHA;Marstaller dorothea;doro.marstaller@googlemail.com;schumannweg 11, 74523 SHA, 01627815156
SHA;Marstaller, Johanna;familie.marstaller@gmx.net;kreuzwiesen1, 74544 Michelbach/Bilz, 0791 855157
SHA;Reber Rudolf;Rudolf.Reber@t-online.de;Gertraud Reber, Grauwiesenweg 16, 74523 Schwäbisch Hall
SHA;Reckwardt Katja;katja.reckwardt@web.de;kastenhof 5, 74538 Rosengarten, 017698261045
SHA;Röhr bettina;ruehr@mailbox.org;Wilhelm-Lotze-Weg 10, 74523 SHA, 0791 97829257
SHA;Schwenger Jutta;ju.schwenger@gmail.com;turmstraße 9, 74623 Schwäbisch Hall-Gottwollshausen, 0160 4444 901
SHA;Türschmann Claudia;claudiatuer@aol.de ;Im Siebenmorgen 18, 74523 Schwäbisch Hall, 015781061224
SHA;Wolpert gudrun;info@physiotherapie-wolpert.de;Koppelinshof 8, 74545 Michelfeld, 0170 6363119
VerSd;Holland Meike;m-j.holland@t-online.de;Hörn 6, 24220 Flintbek, VERSAND
VerSd;Knall Luise;Luiseknall@gmx.de;"Ankoferstrasse 8\n85077 Manching"
VerSd;Kreft ortrud;Ortrud.kreft@wetel.net;"\nSchillerstrasse 6\n26655 Westerstede"
VerSd;Mengen Gabi, Schwester;mail@katrin-mengen.de;FORTEX Kurierdienst Spedition  Einhöge 10 z.H. Gaby Mengen, 79618 Rheinfelden, VERSAND
VerSd;Mengen Katrin;mail@katrin-mengen.de;"Hörn 6\n24220 Flintbek, VERSAND"
VerSd;Merlevede, ilka;ilka.merlevede@googlemail.com;Eichkopfallee 11, 65835 Liederbach am Taunus, +49 178/1812969
`

  console.log("[v0] Customer data loaded, length:", customerData.length)

  // Parse and import
  const lines = customerData
    .trim()
    .split("\n")
    .filter((line) => line.trim())

  console.log(`[v0] Parsed ${lines.length} lines from CSV`)

  const customers = []

  for (const line of lines) {
    const parts = line.split(";")
    if (parts.length >= 3) {
      const distributor = parts[0] ? parts[0].trim() : ""
      const fullName = parts[1] ? parts[1].trim() : ""
      const email = parts[2] ? parts[2].trim() : ""
      const addressRaw = parts[3] ? parts[3].trim() : ""

      if (!fullName || !email) continue

      // Parse name
      const nameParts = fullName.split(/[\s,]+/).filter((p) => p)
      let lastName = ""
      let firstName = ""

      if (nameParts.length >= 2) {
        lastName = nameParts[0]
        firstName = nameParts.slice(1).join(" ")
      } else {
        lastName = fullName
      }

      // Clean address
      const addressClean = addressRaw.replace(/"/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim()

      // Parse address components
      let street = ""
      let houseNumber = ""
      let postalCode = ""
      let city = ""
      let phone = ""

      if (addressClean) {
        const phoneMatch = addressClean.match(/(?:Telefon:\s*)?(\+?[\d\s\-/()]{8,})(?:\s|$)/)
        if (phoneMatch) {
          phone = phoneMatch[1].replace(/\s+/g, "").trim()
        }

        const addressWithoutPhone = addressClean.replace(/(?:Telefon:\s*)?(\+?[\d\s\-/()]{8,})(?:\s|$)/, "").trim()

        const plzCityMatch = addressWithoutPhone.match(/(?:D\s*-\s*)?(\d{5})\s+([^,]+)/)
        if (plzCityMatch) {
          postalCode = plzCityMatch[1]
          city = plzCityMatch[2].trim()

          const streetPart = addressWithoutPhone
            .replace(plzCityMatch[0], "")
            .replace(/^[,\s]+|[,\s]+$/g, "")
            .trim()

          const streetMatch = streetPart.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:\/\d+)?)$/)
          if (streetMatch) {
            street = streetMatch[1].trim()
            houseNumber = streetMatch[2].trim()
          } else {
            street = streetPart
          }
        } else {
          street = addressWithoutPhone
        }
      }

      customers.push({
        id: crypto.randomUUID(),
        user_id: null,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase().trim(),
        email_normalized: email.toLowerCase().trim(),
        street: street,
        house_number: houseNumber,
        postal_code: postalCode,
        city: city,
        country: "Deutschland",
        phone: phone,
        referral_source: distributor,
        customer_segment: "regular",
        marketing_consent: false,
        favorite_categories: [],
        preferred_products: [],
      })
    }
  }

  console.log(`[v0] Parsed ${customers.length} customers successfully`)

  if (customers.length > 0) {
    console.log("[v0] First customer sample:", JSON.stringify(customers[0], null, 2))
  }

  // Insert in batches
  const BATCH_SIZE = 25
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    console.log(`[v0] Inserting batch ${batchNum} (${batch.length} customers)...`)

    try {
      const { data, error } = await supabase.from("customers").insert(batch).select()

      if (error) {
        console.error(`[v0] ❌ Batch ${batchNum} FAILED:`)
        console.error(`[v0]    Code: ${error.code}`)
        console.error(`[v0]    Message: ${error.message}`)
        console.error(`[v0]    Details:`, error.details)
        console.error(`[v0]    Hint: ${error.hint}`)
        errorCount += batch.length
      } else {
        successCount += data.length
        console.log(`[v0] ✓ Batch ${batchNum} SUCCESS: ${data.length} customers inserted`)
      }
    } catch (err) {
      console.error(`[v0] ❌ Batch ${batchNum} EXCEPTION:`, err.message)
      errorCount += batch.length
    }
  }

  console.log(`[v0] ========================================`)
  console.log(`[v0] Import completed!`)
  console.log(`[v0] Total: ${customers.length}`)
  console.log(`[v0] Success: ${successCount}`)
  console.log(`[v0] Errors: ${errorCount}`)
  console.log(`[v0] ========================================`)
})().catch((err) => {
  console.error("[v0] FATAL ERROR:", err)
  console.error("[v0] Stack:", err.stack)
})
